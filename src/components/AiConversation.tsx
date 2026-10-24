"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import AiOrb from "@/components/AiOrb";
import AnalysisCard from "@/components/AnalysisCard";
import { DECLARED_TYPE_LABELS, type Analysis, type DeclaredType } from "@/lib/feedback";

// Où en est l'envoi : enregistrement, analyse par l'IA, terminé, ou analyse qui n'a pas abouti
export type ConversationPhase = "sending" | "thinking" | "done" | "failed";

export type SubmittedFeedback = { type: DeclaredType; content: string; hasScreenshot: boolean };

// Ce que l'IA « fait » pendant l'analyse, affiché à tour de rôle (l'analyse réelle tourne en arrière-plan)
const THINKING_STEPS: Record<DeclaredType, string[]> = {
  bug: ["Lecture de ton retour…", "Évaluation de la gravité…", "Reconstitution des étapes…", "Rédaction de la réponse…"],
  balance: [
    "Lecture de ton retour…",
    "Recherche de l'élément visé…",
    "Comparaison aux statistiques du jeu…",
    "Calcul du verdict…",
    "Rédaction de la réponse…",
  ],
  idea: ["Lecture de ton retour…", "Classement de ton idée…", "Résumé pour l'équipe…", "Rédaction de la réponse…"],
  other: ["Lecture de ton retour…", "Classement par catégorie…", "Résumé pour l'équipe…", "Rédaction de la réponse…"],
};

const STEP_DURATION_MS = 2600;

function ThinkingText({ type }: { type: DeclaredType }) {
  const steps = THINKING_STEPS[type];
  const [index, setIndex] = useState(0);

  // Avance d'une étape à intervalle régulier, puis reste sur la dernière
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), STEP_DURATION_MS);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    // Hauteur libre : sur un écran étroit, une étape longue passe sur deux lignes au lieu d'être coupée
    <div className="relative min-h-7">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className="shimmer block text-lg font-medium"
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
          transition={{ duration: 0.35 }}
        >
          {steps[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <motion.span
        className={`grid size-5 place-items-center rounded-full text-xs ${
          done ? "bg-[var(--ok)] text-[#0c2a1c]" : "border border-[var(--border-strong)]"
        }`}
        initial={false}
        animate={{ scale: done ? [0.6, 1.15, 1] : 1 }}
      >
        {done ? "✓" : ""}
      </motion.span>
      <span className={done ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>{label}</span>
    </li>
  );
}

export default function AiConversation({
  submitted,
  phase,
  analysis,
  error,
  feedbackId,
  onReset,
}: {
  submitted: SubmittedFeedback;
  phase: ConversationPhase;
  analysis: Analysis | null;
  error: string;
  feedbackId: string | null;
  onReset: () => void;
}) {
  const saved = phase !== "sending";
  const orbState = phase === "done" ? "done" : phase === "failed" ? "error" : "thinking";

  return (
    <div className="flex flex-col gap-6">
      {/* Le message du joueur, comme une bulle de conversation */}
      <motion.div
        className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-[var(--border-strong)] bg-[rgba(224,184,74,0.1)] px-5 py-4"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
      >
        <p className="mb-1 text-xs tracking-wide text-[var(--gold)] uppercase">
          {DECLARED_TYPE_LABELS[submitted.type]}
          {submitted.hasScreenshot && " · capture jointe"}
        </p>
        <p className="m-0 whitespace-pre-line text-[var(--foreground)]">{submitted.content}</p>
      </motion.div>

      {/* La réponse de l'IA : l'orbe, ce qu'elle fait, puis le résultat */}
      <motion.div
        className="glass flex flex-col gap-5 overflow-hidden p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-5">
          <AiOrb state={orbState} size={68} />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm text-[var(--muted-foreground)]">Assistant Runejack</p>
            {phase === "sending" && <p className="shimmer m-0 text-lg font-medium">Envoi de ton retour…</p>}
            {phase === "thinking" && <ThinkingText type={submitted.type} />}
            {phase === "done" && <p className="m-0 text-lg font-medium text-[var(--foreground)]">Analyse terminée.</p>}
            {phase === "failed" && (
              <p className="m-0 text-lg font-medium text-[var(--foreground)]">L&apos;analyse automatique n&apos;a pas abouti.</p>
            )}
          </div>
        </div>

        <ul className="m-0 flex flex-col gap-2">
          {submitted.hasScreenshot && <Check done={saved} label="Capture envoyée" />}
          <Check done={saved} label="Retour enregistré" />
          <Check done={phase === "done"} label="Analyse par l'IA" />
        </ul>

        {/* Confirmation qui reste affichée : le retour est pris en compte quoi qu'il arrive à l'analyse */}
        <AnimatePresence>
          {saved && (
            <motion.div
              className="notice m-0 flex items-start gap-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.4 }}
            >
              <span className="text-xl leading-none">✔</span>
              <span>
                <strong>Ton retour a bien été pris en compte.</strong> L&apos;équipe le lira, et tu peux le retrouver
                à tout moment dans « Mes retours ».
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "failed" && error && <p className="m-0 text-sm">{error}</p>}

        {analysis && <AnalysisCard analysis={analysis} fresh />}

        {(phase === "done" || phase === "failed") && (
          <motion.div
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {feedbackId && (
              <Link href={`/retours/${feedbackId}`} className="btn-ghost btn-sm">
                Voir mon retour
              </Link>
            )}
            <button type="button" className="btn btn-sm" onClick={onReset}>
              Envoyer un autre retour
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
