import type { TargetType } from "@/lib/runejack";

export const DECLARED_TYPES = ["bug", "balance", "idea", "other"] as const;
export const CATEGORIES = ["bug", "balance", "idea", "complaint", "other"] as const;
export const SEVERITIES = ["critical", "major", "minor"] as const;
export const CLAIMS = ["too_strong", "too_weak", "other"] as const;
export const VERDICTS = ["confirmed", "contradicted", "insufficient", "unavailable", "not_applicable"] as const;
export const TRIAGE_STATUSES = ["new", "acknowledged", "fixed", "rejected"] as const;

export type DeclaredType = (typeof DECLARED_TYPES)[number];
export type Category = (typeof CATEGORIES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type Claim = (typeof CLAIMS)[number];
export type Verdict = (typeof VERDICTS)[number];
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
export type AnalysisStatus = "pending" | "ready" | "error";

// Ce que rend l'appel 1 au modèle, une fois vérifié
export type Triage = {
  category: Category;
  severity: Severity;
  summary: string;
  repro_steps: string[];
  target_type: TargetType | "none";
  target_id: string | null;
  claim: Claim;
  suggested_reply: string;
};

// Chiffres tirés des stats du jeu ; la partie 7 les remplit
export type Evidence = {
  name: string;
  runs: number;
  winRate: number;
  categoryAverage: number;
  gap: number;
  computedAt: string;
  explanation?: string;
};

export type Feedback = {
  id: string;
  declared_type: DeclaredType;
  content: string;
  screenshot_path: string | null;
  game_version: string | null;
  analysis_status: AnalysisStatus;
  error_message: string | null;
  triage_status: TriageStatus;
  created_at: string;
};

export type Analysis = Omit<Triage, "claim"> & {
  id: string;
  feedback_id: string;
  verdict: Verdict;
  evidence: Evidence | null;
  model: string | null;
  created_at: string;
};

export const LIMITS = {
  contentMin: 30,
  contentMax: 3000,
  summaryMax: 300,
  replyMax: 600,
  stepsMax: 8,
};

// Libellés affichés aux joueurs et aux admins
export const DECLARED_TYPE_LABELS: Record<DeclaredType, string> = {
  bug: "Bug",
  balance: "Équilibrage",
  idea: "Idée",
  other: "Autre",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  bug: "Bug",
  balance: "Équilibrage",
  idea: "Idée",
  complaint: "Plainte",
  other: "Autre",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critique",
  major: "Majeure",
  minor: "Mineure",
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  confirmed: "Confirmé par les données",
  contradicted: "Contredit par les données",
  insufficient: "Données insuffisantes",
  unavailable: "Données indisponibles",
  not_applicable: "Sans objet",
};

export const TRIAGE_STATUS_LABELS: Record<TriageStatus, string> = {
  new: "Nouveau",
  acknowledged: "Pris en compte",
  fixed: "Corrigé",
  rejected: "Non retenu",
};
