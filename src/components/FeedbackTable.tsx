"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AnalysisStatusBadge, CategoryBadge, SeverityBadge, VerdictBadge } from "@/components/FeedbackBadges";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  TRIAGE_STATUS_LABELS,
  TRIAGE_STATUSES,
  VERDICT_LABELS,
  VERDICTS,
  type AnalysisStatus,
  type Category,
  type Severity,
  type TriageStatus,
  type Verdict,
} from "@/lib/feedback";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type FeedbackRow = {
  id: string;
  content: string;
  created_at: string;
  analysis_status: string;
  triage_status: TriageStatus;
  analyses: { category: Category; severity: Severity; verdict: Verdict; created_at: string }[];
};

export default function FeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<Category | "">("");
  const [verdict, setVerdict] = useState<Verdict | "">("");

  // Temps réel : chaque nouveau retour ou changement d'analyse recharge le tableau
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("admin-feedback")
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function changeStatus(id: string, status: TriageStatus) {
    await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  const visibleRows = rows
    .map((row) => ({ ...row, analysis: row.analyses.toSorted((a, b) => b.created_at.localeCompare(a.created_at))[0] }))
    .filter((row) => !category || row.analysis?.category === category)
    .filter((row) => !verdict || row.analysis?.verdict === verdict);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-3xl">Retours des joueurs</h2>
        <span className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="size-2 animate-pulse rounded-full bg-[var(--ok)]" /> Temps réel
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="field w-auto!"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          aria-label="Filtrer par catégorie"
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          className="field w-auto!"
          value={verdict}
          onChange={(e) => setVerdict(e.target.value as Verdict | "")}
          aria-label="Filtrer par verdict"
        >
          <option value="">Tous les verdicts</option>
          {VERDICTS.map((v) => (
            <option key={v} value={v}>
              {VERDICT_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      {visibleRows.length === 0 && <p className="m-0">Aucun retour.</p>}

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {visibleRows.map((row) => (
            <motion.li
              key={row.id}
              layout
              className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="min-w-0 flex-1">
                <Link href={`/retours/${row.id}`} className="line-clamp-2 text-[var(--foreground)]">
                  {row.content}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(row.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  {row.analysis ? (
                    <>
                      <CategoryBadge category={row.analysis.category} />
                      <SeverityBadge severity={row.analysis.severity} />
                      <VerdictBadge verdict={row.analysis.verdict} />
                    </>
                  ) : (
                    <AnalysisStatusBadge status={row.analysis_status as AnalysisStatus} />
                  )}
                </div>
              </div>
              <select
                className="field w-auto! shrink-0 text-sm"
                value={row.triage_status}
                onChange={(e) => changeStatus(row.id, e.target.value as TriageStatus)}
                aria-label="Statut de suivi"
              >
                {TRIAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TRIAGE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
