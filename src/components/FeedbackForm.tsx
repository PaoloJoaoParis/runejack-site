"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import AiConversation, { type ConversationPhase, type SubmittedFeedback } from "@/components/AiConversation";
import AiOrb from "@/components/AiOrb";
import { HaloDropzone } from "@/components/ui/halo-dropzone";
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

// Après une frappe, l'orbe « écoute » encore un court instant
const LISTENING_MS = 900;

export default function FeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<DeclaredType | null>(null);
  const [content, setContent] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);

  // Conversation avec l'IA, ouverte dès l'envoi et gardée jusqu'au prochain retour
  const [submitted, setSubmitted] = useState<SubmittedFeedback | null>(null);
  const [phase, setPhase] = useState<ConversationPhase | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const loading = phase === "sending" || phase === "thinking";
  const length = content.trim().length;
  const isContentValid = length >= LIMITS.contentMin && length <= LIMITS.contentMax;
  const isFileValid = file === null || (file.type in EXTENSION_BY_TYPE && file.size <= MAX_SCREENSHOT_SIZE);
  const isFormValid = type !== null && isContentValid && isFileValid;

  // L'orbe réagit pendant que le joueur écrit
  useEffect(() => {
    if (!typing) return;
    const timer = setTimeout(() => setTyping(false), LISTENING_MS);
    return () => clearTimeout(timer);
  }, [typing, content]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || loading || type === null) return;

    setError("");
    setFeedbackId(null);
    setAnalysis(null);
    setSubmitted({ type, content: content.trim(), hasScreenshot: file !== null });
    setPhase("sending");

    let saved = false;
    try {
      let screenshotPath: string | undefined;
      if (file) {
        screenshotPath = await uploadScreenshot(file);
      }

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
        // Refusé (quota, validation) : on revient au formulaire, rempli tel quel
        setError(data.error ?? "Une erreur est survenue.");
        setSubmitted(null);
        setPhase(null);
        return;
      }

      saved = true;
      setType(null);
      setContent("");
      setVersion("");
      setFile(null);
      setFileInputKey((key) => key + 1);
      setFeedbackId(data.id);

      setPhase("thinking");
      setAnalysis(await waitForAnalysis(data.id));
      setPhase("done");
    } catch (err) {
      setError(err instanceof TypeError ? "Impossible de contacter le serveur." : (err as Error).message);
      if (saved) {
        // Le retour est enregistré : seule l'analyse a échoué, la conversation reste affichée
        setPhase("failed");
      } else {
        setSubmitted(null);
        setPhase(null);
      }
    }
  }

  function reset() {
    setSubmitted(null);
    setPhase(null);
    setFeedbackId(null);
    setAnalysis(null);
    setError("");
  }

  // Ce qui manque encore pour pouvoir envoyer
  const missing = [
    type === null && "choisis un type",
    length < LIMITS.contentMin && `écris au moins ${LIMITS.contentMin} caractères`,
    length > LIMITS.contentMax && `reste sous ${LIMITS.contentMax} caractères`,
    !isFileValid && "change de capture",
  ].filter(Boolean);

  return (
    <AnimatePresence mode="wait">
      {submitted && phase ? (
        <motion.div key="conversation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }}>
          <AiConversation
            submitted={submitted}
            phase={phase}
            analysis={analysis}
            error={error}
            feedbackId={feedbackId}
            onReset={reset}
          />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          className="flex flex-col gap-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
          transition={{ duration: 0.35 }}
        >
          {/* L'assistant, présent avant même l'envoi : il « écoute » quand le joueur écrit */}
          <div className="flex items-center gap-4">
            <AiOrb state={typing ? "listening" : "idle"} size={52} />
            <div>
              <p className="m-0 font-medium text-[var(--foreground)]">Assistant Runejack</p>
              <p className="m-0 text-sm">
                {typing
                  ? "Je t'écoute…"
                  : "Je lirai ton retour, je le trierai pour l'équipe et, s'il parle d'équilibrage, je vérifierai les statistiques."}
              </p>
            </div>
          </div>

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
                onChange={(e) => {
                  setContent(e.target.value);
                  setTyping(true);
                }}
                placeholder="Décris ce qui s'est passé, ce que tu attendais, et ce que tu en penses…"
                isLoading={loading}
                loadingText="Envoi…"
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
                Envoyer le retour
              </button>
              {missing.length > 0 && (
                <span className="text-sm text-[var(--muted-foreground)]">Pour envoyer : {missing.join(", ")}.</span>
              )}
              {remaining !== null && (
                <span className="ml-auto text-sm text-[var(--muted-foreground)]">Envois restants cette heure : {remaining}</span>
              )}
            </div>
          </form>

          {error && (
            <p role="alert" className="alert m-0">
              {error}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
