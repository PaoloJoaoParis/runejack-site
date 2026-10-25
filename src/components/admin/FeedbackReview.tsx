"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import EmbeddingBackfill from "@/components/admin/EmbeddingBackfill";
import { AnalysisStatusBadge, CategoryBadge, TriageBadge, VerdictBadge } from "@/components/FeedbackBadges";
import type { SimilarRow } from "@/components/SimilarFeedback";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  DECLARED_TYPE_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  TRIAGE_STATUS_LABELS,
  TRIAGE_STATUSES,
  VERDICT_LABELS,
  VERDICTS,
  type AnalysisStatus,
  type DeclaredType,
  type Severity,
  type TriageStatus,
} from "@/lib/feedback";
import { filtersToSearch, latestAnalysis, type FeedbackFilters, type ReviewRow } from "@/lib/review-filters";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "var(--danger)",
  major: "var(--gold)",
  minor: "var(--iris)",
};

// Revue des retours : pensée pour rester lisible avec beaucoup de retours.
// Vue par statut de suivi (« À traiter » par défaut), filtres et recherche dans l'adresse, pages de 20,
// résumé de l'IA en titre, gravité en couleur, export de la vue en JSON ou en Markdown.
export default function FeedbackReview({
  rows,
  total,
  filters,
  counts,
  pageSize,
  unindexed,
  similarById,
}: {
  similarById: Record<string, SimilarRow[]>;
  rows: ReviewRow[];
  total: number;
  filters: FeedbackFilters;
  counts: Record<TriageStatus, number>;
  pageSize: number;
  unindexed: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // Regroupe les doublons de la page : chaque groupe est affiché d'un bloc, à la place de son retour le plus récent.
  // groupStart vaut true pour le premier retour d'un groupe ; les suivants sont décalés sous lui.
  const ordered = useMemo(() => {
    const onPage = new Set(rows.map((r) => r.id));
    const placed = new Set<string>();
    const result: { row: ReviewRow; inGroup: boolean; groupStart: boolean }[] = [];
    for (const row of rows) {
      if (placed.has(row.id)) continue;
      // Tous les retours de la page reliés à celui-ci, de proche en proche
      const group = new Set<string>();
      const stack = [row.id];
      while (stack.length) {
        const id = stack.pop()!;
        if (group.has(id) || placed.has(id) || !onPage.has(id)) continue;
        group.add(id);
        for (const similar of similarById[id] ?? []) stack.push(similar.id);
      }
      group.forEach((id) => placed.add(id));
      const members = rows.filter((r) => group.has(r.id));
      members.forEach((member, i) => result.push({ row: member, inGroup: members.length > 1, groupStart: i === 0 }));
    }
    return result;
  }, [rows, similarById]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const go = (changes: Partial<FeedbackFilters>) => router.push(`/admin${filtersToSearch(filters, changes)}`);
  const hasFilters = Boolean(filters.category || filters.severity || filters.verdict || filters.q);

  // Temps réel : un nouveau retour ou un changement d'analyse recharge la vue
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
    setBusyId(id);
    await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    router.refresh();
  }

  // Traite un retour et tous ses doublons d'un coup (par exemple « Pris en compte » pour tout le groupe)
  async function changeGroupStatus(id: string, status: TriageStatus) {
    setBusyId(id);
    const ids = [id, ...(similarById[id] ?? []).map((similar) => similar.id)];
    await Promise.all(
      ids.map((target) =>
        fetch(`/api/admin/feedback/${target}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setBusyId(null);
    setOpenId(null);
    router.refresh();
  }

  // L'export reprend exactement les filtres de la vue, sans la pagination
  const exportSearch = filtersToSearch(filters).replace("?onglet=retours", "").replace(/^&/, "");
  const exportHref = (format: "json" | "md") =>
    `/api/admin/feedback/export?format=${format}${exportSearch ? `&${exportSearch}` : ""}`;

  return (
    <section className="flex flex-col gap-5">
      {/* Vues par statut de suivi */}
      <div className="flex flex-wrap gap-2">
        {[...TRIAGE_STATUSES, "all" as const].map((status) => {
          const active = filters.status === status;
          const count = status === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[status];
          return (
            <Link
              key={status}
              href={`/admin${filtersToSearch(filters, { status })}`}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm no-underline transition-colors ${
                active
                  ? "border-[var(--border-strong)] bg-[rgba(224,184,74,0.14)] text-[var(--gold-light)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {status === "all" ? "Tous" : status === "new" ? "À traiter" : TRIAGE_STATUS_LABELS[status]}
              <span className="tabular-nums opacity-70">{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Recherche, filtres et actions */}
      <div className="glass flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <form
          className="min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: search.trim() });
          }}
        >
          <input
            className="field"
            type="search"
            placeholder="Rechercher dans les retours… (Entrée)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher dans les retours"
          />
        </form>
        <div className="flex flex-wrap gap-2">
          <Filter
            label="Catégorie"
            value={filters.category ?? ""}
            options={CATEGORIES.map((c) => [c, CATEGORY_LABELS[c]])}
            onChange={(v) => go({ category: (v || null) as FeedbackFilters["category"] })}
          />
          <Filter
            label="Gravité"
            value={filters.severity ?? ""}
            options={SEVERITIES.map((s) => [s, SEVERITY_LABELS[s]])}
            onChange={(v) => go({ severity: (v || null) as FeedbackFilters["severity"] })}
          />
          <Filter
            label="Verdict"
            value={filters.verdict ?? ""}
            options={VERDICTS.map((v) => [v, VERDICT_LABELS[v]])}
            onChange={(v) => go({ verdict: (v || null) as FeedbackFilters["verdict"] })}
          />
          {hasFilters && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setSearch("");
                go({ category: null, severity: null, verdict: null, q: "" });
              }}
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-auto text-sm text-[var(--muted-foreground)]">
          {total} retour(s){pages > 1 && ` · page ${filters.page} sur ${pages}`}
        </span>
        {unindexed > 0 && <EmbeddingBackfill initialRemaining={unindexed} />}
        {/* Liens simples (pas <Link>) : ce sont des téléchargements, pas des pages */}
        <a href={exportHref("json")} className="btn-ghost btn-sm" download>
          Exporter en JSON
        </a>
        <a href={exportHref("md")} className="btn-ghost btn-sm" download>
          Exporter pour une IA (Markdown)
        </a>
      </div>

      {rows.length === 0 && (
        <div className="glass p-8 text-center">
          <p className="m-0">{hasFilters ? "Aucun retour ne correspond à ces filtres." : "Aucun retour dans cette vue."}</p>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {ordered.map(({ row, inGroup, groupStart }) => {
            const analysis = latestAnalysis(row);
            const similar = similarById[row.id] ?? [];
            const open = openId === row.id;
            return (
              <motion.li
                key={row.id}
                layout
                className={`glass relative overflow-hidden p-4 pl-5 ${inGroup ? "border-[rgba(185,139,255,0.45)]!" : ""} ${
                  inGroup && !groupStart ? "-mt-1 ml-4 sm:ml-8" : ""
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: busyId === row.id ? 0.5 : 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Bande de couleur : la gravité se lit sans lire le texte */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ background: analysis ? SEVERITY_COLORS[analysis.severity] : "var(--border)" }}
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/retours/${row.id}`} className="line-clamp-1 font-medium text-[var(--foreground)]">
                    {analysis?.summary ?? row.content}
                  </Link>
                  {analysis && <p className="m-0 line-clamp-1 text-sm">« {row.content} »</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span>{new Date(row.created_at).toLocaleDateString("fr-FR")}</span>
                    <span>· {DECLARED_TYPE_LABELS[row.declared_type as DeclaredType]}</span>
                    {row.game_version && <span>· v{row.game_version}</span>}
                    {similar.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : row.id)}
                        className="rounded-full border border-[rgba(185,139,255,0.5)] bg-[rgba(185,139,255,0.12)] px-2.5 py-0.5 text-xs font-medium text-[var(--iris)] transition-colors hover:bg-[rgba(185,139,255,0.22)]"
                        aria-expanded={open}
                      >
                        {open ? "Masquer les similaires" : `${similar.length} similaire(s)`}
                      </button>
                    )}
                    {analysis ? (
                      <>
                        <CategoryBadge category={analysis.category} />
                        <span style={{ color: SEVERITY_COLORS[analysis.severity] }}>
                          {SEVERITY_LABELS[analysis.severity]}
                        </span>
                        <VerdictBadge verdict={analysis.verdict} />
                      </>
                    ) : (
                      <AnalysisStatusBadge status={row.analysis_status as AnalysisStatus} />
                    )}
                  </div>
                </div>
                <select
                  className="field w-auto! shrink-0 text-sm"
                  value={row.triage_status}
                  disabled={busyId === row.id}
                  onChange={(e) => changeStatus(row.id, e.target.value as TriageStatus)}
                  aria-label="Statut de suivi"
                >
                  {TRIAGE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TRIAGE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                </div>

                {/* Doublons probables de ce retour, et traitement du groupe entier */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4">
                        <p className="m-0 text-xs tracking-wide text-[var(--iris)] uppercase">
                          Doublons probables : même problème, décrit avec d&apos;autres mots
                        </p>
                        {similar.map((item) => (
                          <Link
                            key={item.id}
                            href={`/retours/${item.id}`}
                            className="flex items-center gap-3 rounded-lg bg-[rgba(12,6,16,0.45)] px-3 py-2 text-sm no-underline hover:bg-[rgba(185,139,255,0.08)]"
                          >
                            <span className="w-12 shrink-0 font-[family-name:var(--font-jersey)] text-xl text-[var(--gold-light)]">
                              {Math.round(item.similarity * 100)} %
                            </span>
                            <span className="line-clamp-1 min-w-0 flex-1 text-[var(--foreground)]">{item.content}</span>
                            <TriageBadge status={item.triage_status} />
                          </Link>
                        ))}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-sm">Traiter tout le groupe ({similar.length + 1} retours) :</span>
                          {TRIAGE_STATUSES.filter((status) => status !== "new").map((status) => (
                            <button
                              key={status}
                              type="button"
                              className="btn-ghost btn-sm"
                              disabled={busyId !== null}
                              onClick={() => changeGroupStatus(row.id, status)}
                            >
                              {TRIAGE_STATUS_LABELS[status]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3">
          {filters.page > 1 ? (
            <Link href={`/admin${filtersToSearch(filters, { page: filters.page - 1 })}`} className="btn-ghost btn-sm">
              ← Précédents
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-[var(--muted-foreground)]">
            {filters.page} / {pages}
          </span>
          {filters.page < pages && (
            <Link href={`/admin${filtersToSearch(filters, { page: filters.page + 1 })}`} className="btn-ghost btn-sm">
              Suivants →
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  return (
    <select className="field w-auto! text-sm" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label} : toutes</option>
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}
