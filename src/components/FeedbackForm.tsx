"use client";

import { useState } from "react";
import Link from "next/link";
import AnalysisCard from "@/components/AnalysisCard";
import {
  DECLARED_TYPE_LABELS,
  DECLARED_TYPES,
  LIMITS,
  type Analysis,
  type AnalysisStatus,
  type DeclaredType,
} from "@/lib/feedback";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_SCREENSHOT_SIZE = 2 * 1024 * 1024;
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_WAIT_MS = 90000;

type FeedbackState = {
  analysis_status: AnalysisStatus;
  error_message: string | null;
  analysis: Analysis | null;
};

async function readState(id: string): Promise<FeedbackState | null> {
  const response = await fetch(`/api/feedback/${id}`, { cache: "no-store" });
  return response.ok ? response.json() : null;
}

// S'abonne aux changements du retour et attend que son analyse soit prête ou en erreur
async function waitForAnalysis(id: string): Promise<Analysis> {
  const supabase = createSupabaseBrowserClient();

  // L'abonnement doit être fait au nom du joueur pour que la RLS laisse passer les événements
  await supabase.auth.getSession();

  return new Promise((resolve, reject) => {
    const channel = supabase.channel(`feedback-${id}`);
    let done = false;

    function finish(action: () => void) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
      action();
    }

    async function inspect(status: AnalysisStatus, errorMessage: string | null) {
      if (status === "error") {
        finish(() => reject(new Error(errorMessage ?? "L'analyse automatique a échoué.")));
      }
      if (status === "ready") {
        const analysis = (await readState(id))?.analysis;
        if (analysis) finish(() => resolve(analysis));
      }
    }

    const timer = setTimeout(
      () =>
        finish(() =>
          reject(new Error("L'analyse prend plus de temps que prévu. Elle apparaîtra dans « Mes retours » dès qu'elle sera prête."))
        ),
      MAX_WAIT_MS
    );

    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "feedback", filter: `id=eq.${id}` },
        (event) => {
          const row = event.new as { analysis_status: AnalysisStatus; error_message: string | null };
          void inspect(row.analysis_status, row.error_message);
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // L'analyse a pu se terminer avant l'abonnement : on vérifie une fois l'état actuel
          const state = await readState(id);
          if (state) void inspect(state.analysis_status, state.error_message);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          finish(() =>
            reject(new Error("La connexion en temps réel a échoué. Ton analyse apparaîtra dans « Mes retours » dès qu'elle sera prête."))
          );
        }
      });
  });
}

async function uploadScreenshot(file: File): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Ta session a expiré. Reconnecte-toi.");
  }

  const path = `${user.id}/${crypto.randomUUID()}.${EXTENSION_BY_TYPE[file.type]}`;
  const { error } = await supabase.storage.from("screenshots").upload(path, file, { contentType: file.type });

  if (error) {
    console.error(error);
    throw new Error("L'envoi de la capture a échoué. Utilise une image PNG, JPEG ou WebP de 2 Mo maximum.");
  }

  return path;
}

export default function FeedbackForm() {
  const [type, setType] = useState<DeclaredType | null>(null);
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const length = content.trim().length;
  const isContentValid = length >= LIMITS.contentMin && length <= LIMITS.contentMax;
  const isFileValid = file === null || (file.type in EXTENSION_BY_TYPE && file.size <= MAX_SCREENSHOT_SIZE);
  const isFormValid = type !== null && isContentValid && isFileValid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFeedbackId(null);
    setAnalysis(null);

    try {
      let screenshotPath: string | undefined;
      if (file) {
        setStep("Envoi de la capture…");
        screenshotPath = await uploadScreenshot(file);
      }

      setStep("Enregistrement du retour…");
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content, version, screenshotPath }),
      });
      const data = await response.json();

      const remainingHeader = response.headers.get("X-RateLimit-Remaining");
      if (remainingHeader !== null) {
        setRemaining(Number(remainingHeader));
      }

      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      setType(null);
      setContent("");
      setVersion("");
      setFile(null);
      setFileInputKey((key) => key + 1);
      setFeedbackId(data.id);

      setStep("Analyse en cours…");
      setAnalysis(await waitForAnalysis(data.id));
    } catch (err) {
      setError(err instanceof TypeError ? "Impossible de contacter le serveur." : (err as Error).message);
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  return (
    <div>
      <form onSubmit={submit}>
        <fieldset>
          <legend>Type de retour</legend>
          {DECLARED_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t}>
              {type === t ? "✔ " : ""}
              {DECLARED_TYPE_LABELS[t]}
            </button>
          ))}
        </fieldset>

        <div>
          <label htmlFor="content">Ton retour</label>
          <br />
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Décris ce qui s'est passé, ce que tu attendais, et ce que tu en penses…"
            rows={10}
            cols={60}
          />
          <p>
            {length} caractères (entre {LIMITS.contentMin} et {LIMITS.contentMax})
          </p>
        </div>

        <div>
          <label htmlFor="version">Version du jeu (facultatif)</label>
          <br />
          <input
            id="version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            maxLength={LIMITS.versionMax}
            placeholder="0.76"
          />
        </div>

        <div>
          <label htmlFor="screenshot">Capture d&apos;écran (facultatif)</label>
          <br />
          <input
            key={fileInputKey}
            id="screenshot"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p>PNG, JPEG ou WebP, 2 Mo maximum{isFileValid ? "" : " : ce fichier ne convient pas"}</p>
        </div>

        <button type="submit" disabled={!isFormValid || loading}>
          {loading ? step : "Envoyer le retour"}
        </button>
      </form>

      {remaining !== null && <p>Envois restants cette heure : {remaining}</p>}

      {error && <p role="alert">{error}</p>}

      {feedbackId && (
        <p>
          Merci, ton retour est enregistré. <Link href={`/retours/${feedbackId}`}>Voir mon retour</Link>
        </p>
      )}

      {analysis && <AnalysisCard analysis={analysis} />}
    </div>
  );
}
