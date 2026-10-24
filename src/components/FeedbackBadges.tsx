"use client";

import { HaloBadge } from "@/components/ui/halo-badge";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  TRIAGE_STATUS_LABELS,
  VERDICT_LABELS,
  type AnalysisStatus,
  type Category,
  type Severity,
  type TriageStatus,
  type Verdict,
} from "@/lib/feedback";

// Pastilles Cult UI qui résument un retour : catégorie, gravité, verdict, suivi

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />;
}

export function CategoryBadge({ category }: { category: Category }) {
  return <HaloBadge variant="outline">{CATEGORY_LABELS[category]}</HaloBadge>;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "var(--danger)",
  major: "var(--gold)",
  minor: "var(--iris)",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <HaloBadge variant={severity === "critical" ? "destructive" : "secondary"}>
      <Dot color={SEVERITY_COLORS[severity]} />
      Gravité {SEVERITY_LABELS[severity].toLowerCase()}
    </HaloBadge>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "not_applicable") return null;
  const color = verdict === "confirmed" ? "var(--ok)" : verdict === "contradicted" ? "var(--danger)" : "var(--muted-foreground)";
  return (
    <HaloBadge
      variant={verdict === "contradicted" ? "destructive" : "outline"}
      rim={verdict === "confirmed" ? "success" : undefined}
    >
      <Dot color={color} />
      {VERDICT_LABELS[verdict]}
    </HaloBadge>
  );
}

const TRIAGE_COLORS: Record<TriageStatus, string> = {
  new: "var(--iris)",
  acknowledged: "var(--gold)",
  fixed: "var(--ok)",
  rejected: "var(--muted-foreground)",
};

export function TriageBadge({ status }: { status: TriageStatus }) {
  return (
    <HaloBadge variant="secondary" rim={status === "fixed" ? "success" : undefined}>
      <Dot color={TRIAGE_COLORS[status]} />
      {TRIAGE_STATUS_LABELS[status]}
    </HaloBadge>
  );
}

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  if (status === "pending") {
    return (
      <HaloBadge live variant="default">
        Analyse en cours
      </HaloBadge>
    );
  }
  if (status === "error") {
    return <HaloBadge variant="destructive">Analyse échouée</HaloBadge>;
  }
  return null;
}
