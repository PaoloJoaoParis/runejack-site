"use client";

import { motion, useReducedMotion } from "motion/react";
import { CategoryBadge, SeverityBadge, VerdictBadge } from "@/components/FeedbackBadges";
import { AiBlobWarpAvatar } from "@/components/ui/ai-blob-warp";
import { BorderBeamCard } from "@/components/ui/border-beam-card";
import type { Analysis } from "@/lib/feedback";

const percent = (value: number) => `${value.toLocaleString("fr-FR")} %`;

// Le résumé de l'IA apparaît mot à mot, comme s'il était écrit en direct
function StreamedText({ text }: { text: string }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <p className="text-lg text-[var(--foreground)]">{text}</p>;

  return (
    <motion.p
      className="text-lg text-[var(--foreground)]"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.035, delayChildren: 0.3 } } }}
    >
      {text.split(" ").map((word, index) => (
        <motion.span
          key={index}
          className="inline-block"
          variants={{
            hidden: { opacity: 0, y: 6, filter: "blur(4px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          }}
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </motion.p>
  );
}

// Barre horizontale qui se remplit jusqu'au taux de victoire
function RateBar({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className={highlight ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>{label}</span>
        <span className="tabular-nums text-[var(--gold-light)]">{percent(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(12,6,16,0.7)]">
        <motion.div
          className={`h-full origin-left rounded-full ${
            highlight
              ? "bg-[linear-gradient(90deg,var(--gold),var(--gold-light))] shadow-[0_0_14px_rgba(224,184,74,0.6)]"
              : "bg-[linear-gradient(90deg,#6d5876,var(--iris))]"
          }`}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: Math.min(value, 100) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function AnalysisBody({ analysis, adminView }: { analysis: Analysis; adminView: boolean }) {
  const evidence = analysis.evidence;

  return (
    <div className="flex flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <AiBlobWarpAvatar className="size-10" />
        <div className="mr-auto">
          <span className="block font-[family-name:var(--font-jersey)] text-2xl leading-none text-[var(--gold-light)]">
            Analyse de l&apos;IA
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {new Date(analysis.created_at).toLocaleString("fr-FR")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <CategoryBadge category={analysis.category} />
          <SeverityBadge severity={analysis.severity} />
          <VerdictBadge verdict={analysis.verdict} />
        </div>
      </div>

      <StreamedText text={analysis.summary} />

      {analysis.repro_steps.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm tracking-wider text-[var(--iris)] uppercase">Étapes pour reproduire</h3>
          <ol className="flex flex-col gap-2">
            {analysis.repro_steps.map((step, index) => (
              <motion.li
                key={index}
                className="flex gap-3 rounded-xl bg-[rgba(12,6,16,0.45)] px-4 py-3 text-[var(--muted-foreground)]"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.08 }}
              >
                <span className="font-[family-name:var(--font-jersey)] text-xl leading-none text-[var(--gold)]">
                  {index + 1}
                </span>
                {step}
              </motion.li>
            ))}
          </ol>
        </section>
      )}

      {evidence && (
        <section className="rounded-2xl border border-[var(--border)] bg-[rgba(12,6,16,0.45)] p-5">
          <h3 className="mb-4 text-sm tracking-wider text-[var(--iris)] uppercase">Confronté aux statistiques du jeu</h3>
          <div className="flex flex-col gap-4">
            <RateBar label={`${evidence.name} · ${evidence.runs} runs`} value={evidence.winRate} highlight />
            <RateBar label="Moyenne de la catégorie" value={evidence.categoryAverage} />
          </div>
          {evidence.explanation && <p className="mt-4 mb-0">{evidence.explanation}</p>}
          <p className="mt-3 mb-0 text-xs">Statistiques du {new Date(evidence.computedAt).toLocaleString("fr-FR")}</p>
        </section>
      )}

      {adminView && (
        <section>
          <h3 className="mb-3 text-sm tracking-wider text-[var(--iris)] uppercase">Réponse proposée au joueur</h3>
          <blockquote className="border-l-2 border-[var(--gold)] pl-4 text-[var(--foreground)] italic">
            {analysis.suggested_reply}
          </blockquote>
        </section>
      )}
    </div>
  );
}

// Carte d'analyse : un liseré lumineux tourne autour quand l'analyse vient d'arriver
export default function AnalysisCard({
  analysis,
  adminView = false,
  fresh = false,
}: {
  analysis: Analysis;
  adminView?: boolean;
  fresh?: boolean;
}) {
  const body = <AnalysisBody analysis={analysis} adminView={adminView} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {fresh ? (
        <BorderBeamCard theme="dark" colorVariant="gold" cardClassName="glass border-0! bg-transparent! py-0! gap-0!">
          {body}
        </BorderBeamCard>
      ) : (
        <div className="glass">{body}</div>
      )}
    </motion.div>
  );
}
