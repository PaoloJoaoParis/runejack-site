"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  TRIAGE_STATUS_LABELS,
  TRIAGE_STATUSES,
  VERDICT_LABELS,
  VERDICTS,
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
    <section>
      <h2>Retours des joueurs</h2>
      <select value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
        <option value="">Toutes les catégories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>{" "}
      <select value={verdict} onChange={(e) => setVerdict(e.target.value as Verdict | "")}>
        <option value="">Tous les verdicts</option>
        {VERDICTS.map((v) => (
          <option key={v} value={v}>
            {VERDICT_LABELS[v]}
          </option>
        ))}
      </select>

      {visibleRows.length === 0 && <p>Aucun retour.</p>}

      <ul>
        {visibleRows.map((row) => (
          <li key={row.id}>
            <Link href={`/retours/${row.id}`}>{row.content}</Link>
            <br />
            {row.analysis
              ? `${CATEGORY_LABELS[row.analysis.category]} · ${SEVERITY_LABELS[row.analysis.severity]} · ${VERDICT_LABELS[row.analysis.verdict]}`
              : "Analyse en cours"}{" "}
            <select value={row.triage_status} onChange={(e) => changeStatus(row.id, e.target.value as TriageStatus)}>
              {TRIAGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TRIAGE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}
