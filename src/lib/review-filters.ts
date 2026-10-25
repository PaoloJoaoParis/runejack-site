import {
  CATEGORIES,
  SEVERITIES,
  TRIAGE_STATUSES,
  VERDICTS,
  type Category,
  type Evidence,
  type Severity,
  type TriageStatus,
  type Verdict,
} from "@/lib/feedback";

// Revue des retours dans /admin (code sans secret, utilisable côté navigateur) : filtres lus dans l'adresse (?statut=new&categorie=bug…),
// partagés par la page et par l'export, pour qu'un export contienne exactement ce qui est affiché.

export const PAGE_SIZE = 20;
export const EXPORT_LIMIT = 1000;
// Ressemblance minimale (similarité cosinus des embeddings) pour signaler deux retours comme doublons
export const SIMILARITY_THRESHOLD = 0.78;

export type FeedbackFilters = {
  status: TriageStatus | "all";
  category: Category | null;
  severity: Severity | null;
  verdict: Verdict | null;
  q: string;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const pick = <T extends string>(value: string, allowed: readonly T[]): T | null =>
  (allowed as readonly string[]).includes(value) ? (value as T) : null;

// Valeurs venues de l'adresse : tout ce qui n'est pas connu est ignoré
export function parseFilters(params: Params): FeedbackFilters {
  const status = first(params.statut);
  return {
    // Par défaut, les retours à traiter : c'est ce que l'admin doit voir en premier
    status: status === "all" ? "all" : (pick(status, TRIAGE_STATUSES) ?? "new"),
    category: pick(first(params.categorie), CATEGORIES),
    severity: pick(first(params.gravite), SEVERITIES),
    verdict: pick(first(params.verdict), VERDICTS),
    // Recherche plein texte simple ; les jokers SQL sont retirés
    q: first(params.q).replace(/[%_*,()]/g, " ").trim().slice(0, 100),
    page: Math.max(1, Number.parseInt(first(params.page), 10) || 1),
  };
}

// Adresse d'une vue avec certains filtres changés (la page revient à 1 si un filtre change)
export function filtersToSearch(filters: FeedbackFilters, changes: Partial<FeedbackFilters> = {}): string {
  const next = { ...filters, page: 1, ...changes };
  const params = new URLSearchParams({ onglet: "retours" });
  if (next.status !== "new") params.set("statut", next.status);
  if (next.category) params.set("categorie", next.category);
  if (next.severity) params.set("gravite", next.severity);
  if (next.verdict) params.set("verdict", next.verdict);
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  return `?${params.toString()}`;
}

export type ReviewAnalysis = {
  category: Category;
  severity: Severity;
  verdict: Verdict;
  summary: string;
  repro_steps: string[];
  evidence: Evidence | null;
  suggested_reply: string;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  declared_type: string;
  content: string;
  game_version: string | null;
  created_at: string;
  analysis_status: string;
  triage_status: TriageStatus;
  analyses: ReviewAnalysis[];
};

// Analyse la plus récente d'un retour (un retour peut avoir été réanalysé)
export function latestAnalysis(row: ReviewRow): ReviewAnalysis | undefined {
  return row.analyses.toSorted((a, b) => b.created_at.localeCompare(a.created_at))[0];
}
