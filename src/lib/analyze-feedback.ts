import "server-only";
import { explainVerdict } from "@/lib/explain-verdict";
import type { Evidence, Feedback, Triage, Verdict } from "@/lib/feedback";
import { findStatLine, loadCatalog, loadStats, type Catalog, type StatLine } from "@/lib/runejack";
import { triageFeedback } from "@/lib/triage-feedback";
import { decideVerdict, gapToAverage, weightedAverage } from "@/lib/verdict";

export type AnalysisResult = Triage & { verdict: Verdict; evidence: Evidence | null };

const EMPTY_CATALOG: Catalog = { hero: [], contract: [], rune: [], item: [], blessing: [] };

export async function analyzeFeedback(
  feedback: Pick<Feedback, "id" | "content" | "declared_type">,
  userId: string
): Promise<AnalysisResult> {
  // Jeu injoignable : le tri continue sans catalogue (aucune cible, verdict « indisponible »)
  let catalog: Catalog | null = null;
  try {
    catalog = await loadCatalog();
  } catch (error) {
    console.error("Catalogue du jeu indisponible :", error);
  }

  const triage = await triageFeedback(feedback.content, feedback.declared_type, catalog ?? EMPTY_CATALOG, {
    id: feedback.id,
    name: "feedback-analysis",
    userId,
  });

  if (triage.category !== "balance") {
    return { ...triage, verdict: "not_applicable", evidence: null };
  }

  // Sans le jeu, rien n'est vérifiable (et le tri n'a pas pu désigner de cible) ; sans cible, rien à vérifier
  if (!catalog) {
    return { ...triage, verdict: "unavailable", evidence: null };
  }
  if (triage.target_type === "none" || !triage.target_id) {
    return { ...triage, verdict: "not_applicable", evidence: null };
  }

  const targetType = triage.target_type;
  const element = catalog[targetType].find((e) => e.id === triage.target_id);
  if (!element) {
    return { ...triage, verdict: "not_applicable", evidence: null };
  }

  // Stats fraîches, sans cache : ce sont les preuves
  let lines: StatLine[];
  try {
    lines = await loadStats(targetType);
  } catch (error) {
    console.error("Statistiques du jeu indisponibles :", error);
    return { ...triage, verdict: "unavailable", evidence: null };
  }

  const line = findStatLine(lines, element);
  const runs = line?.runs ?? 0;
  const winRate = line?.winRate ?? 0;
  const categoryAverage = weightedAverage(lines);
  const gap = gapToAverage(winRate, categoryAverage);
  const verdict = decideVerdict(triage.claim, runs, gap);

  const evidence: Evidence = {
    name: element.name,
    runs,
    winRate,
    categoryAverage,
    gap,
    computedAt: new Date().toISOString(),
  };

  if (verdict === "confirmed" || verdict === "contradicted") {
    evidence.explanation = await explainVerdict(evidence, verdict, triage.claim, {
      id: feedback.id,
      name: "feedback-analysis",
      userId,
    });
  }

  return { ...triage, verdict, evidence };
}
