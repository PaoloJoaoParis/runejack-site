"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import AnalysisCard from "@/components/AnalysisCard";
import { AiBlobWarpAvatar } from "@/components/ui/ai-blob-warp";
import { HaloDropzone } from "@/components/ui/halo-dropzone";
import { HaloProgress } from "@/components/ui/halo-progress";
import { HaloSegmented } from "@/components/ui/halo-segmented";
import { PromptComposer } from "@/components/ui/prompt-composer";
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

// Étapes de l'envoi, avec leur avancement dans la barre de progression (null : durée inconnue)
const STEPS = {
  upload: { label: "Envoi de la capture…", progress: 20 },
  save: { label: "Enregistrement du retour…", progress: 45 },
  analyse: { label: "L'IA analyse ton retour…", progress: null },
} as const;

type Step = keyof typeof STEPS;

export default function FeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<DeclaredType | null>(null);
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
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
    if (!isFormValid || loading) return;
    setLoading(true);
    setError("");
    setFeedbackId(null);
    setAnalysis(null);

    try {
      let screenshotPath: string | undefined;
      if (file) {
        setStep("upload");
        screenshotPath = await uploadScreenshot(file);
      }

      setStep("save");
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

      setStep("analyse");
      setAnalysis(await waitForAnalysis(data.id));
    } catch (err) {
      setError(err instanceof TypeError ? "Impossible de contacter le serveur." : (err as Error).message);
    } finally {
      setLoading(false);
      setStep(null);
    }
  }

  // Ce qui manque encore pour pouvoir envoyer
  const missing = [
    type === null && "choisis un type",
    length < LIMITS.contentMin && `écris au moins ${LIMITS.contentMin} caractères`,
    length > LIMITS.contentMax && `reste sous ${LIMITS.contentMax} caractères`,
    !isFileValid && "change de capture",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <form ref={formRef} onSubmit={submit} className="glass flex flex-col gap-7 p-6 sm:p-8">
        <fieldset>
          <legend className="label mb-3">Type de retour</legend>
          <HaloSegmented
            className="w-full sm:w-auto"
            items={DECLARED_TYPES.map((t) => ({ value: t, label: DECLARED_TYPE_LABELS[t] }))}
            value={type ?? ""}
            onValueChange={(next) => setType(next as DeclaredType)}
            disabled={loading}
          />
        </fieldset>

        <div>
          <label htmlFor="content" className="label">
            Ton retour
          </label>
          <PromptComposer
            id="content"
            aria-label="Ton retour"
            className="max-w-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Décris ce qui s'est passé, ce que tu attendais, et ce que tu en penses…"
            isLoading={loading}
            loadingText={step ? STEPS[step].label : "Envoi…"}
            onSend={() => formRef.current?.requestSubmit()}
            rows={6}
            maxAutoGrowPx={360}
          />
          <p className="mt-2 mb-0 flex justify-between text-sm">
            <span>Ctrl + Entrée pour envoyer</span>
            <span className={isContentValid || length === 0 ? "" : "text-[var(--danger)]"}>
              {length} / {LIMITS.contentMax}
            </span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <label htmlFor="version" className="label">
              Version du jeu <span className="font-normal text-[var(--muted-foreground)]">(facultatif)</span>
            </label>
            <input
              id="version"
              className="field"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              maxLength={LIMITS.versionMax}
              placeholder="0.76"
            />
          </div>

          <div>
            <span className="label">
              Capture d&apos;écran <span className="font-normal text-[var(--muted-foreground)]">(facultatif)</span>
            </span>
            <HaloDropzone
              key={fileInputKey}
              accept="image/png,image/jpeg,image/webp"
              onFiles={(files) => setFile(files[0] ?? null)}
              disabled={loading}
              successResetMs={0}
              emptyLabel="Dépose ta capture ou parcours"
              successLabel={isFileValid ? "Capture prête" : "Ce fichier ne convient pas"}
              formatHint="PNG, JPEG ou WebP, 2 Mo maximum"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn" disabled={!isFormValid || loading}>
            {loading ? "Envoi en cours…" : "Envoyer le retour"}
          </button>
          {!loading && missing.length > 0 && <span className="text-sm text-[var(--muted-foreground)]">Pour envoyer : {missing.join(", ")}.</span>}
          {remaining !== null && (
            <span className="ml-auto text-sm text-[var(--muted-foreground)]">Envois restants cette heure : {remaining}</span>
          )}
        </div>
      </form>

      <AnimatePresence>
        {step && (
          <motion.div
            key="progress"
            className="glass flex items-center gap-4 p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AiBlobWarpAvatar className="size-10 shrink-0" warpProps={{ speed: 3 }} />
            <HaloProgress className="flex-1" label={STEPS[step].label} value={STEPS[step].progress} />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p role="alert" className="alert m-0">
          {error}
        </p>
      )}

      {feedbackId && (
        <p className="notice m-0">
          Merci, ton retour est enregistré. <Link href={`/retours/${feedbackId}`}>Voir mon retour</Link>
        </p>
      )}

      {analysis && <AnalysisCard analysis={analysis} fresh />}
    </div>
  );
}
