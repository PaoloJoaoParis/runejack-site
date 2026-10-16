import type { Claim, Evidence, Verdict } from "@/lib/feedback";
import type { StatLine } from "@/lib/runejack";

export const MIN_RUNS = 30;
export const SIGNIFICANT_GAP = 5; // en points de pourcentage

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

// Taux de victoire moyen de la catégorie, pondéré par le nombre de runs de chaque élément
export function weightedAverage(lines: StatLine[]): number {
  const runs = lines.reduce((total, line) => total + line.runs, 0);
  if (runs === 0) return 0;

  const sum = lines.reduce((total, line) => total + line.winRate * line.runs, 0);
  return roundToTenth(sum / runs);
}

export function gapToAverage(winRate: number, average: number): number {
  return roundToTenth(winRate - average);
}

// Le verdict est décidé ici, jamais par le modèle
export function decideVerdict(claim: Claim, runs: number, gap: number): Verdict {
  if (claim === "other") return "not_applicable";
  if (runs < MIN_RUNS) return "insufficient";
  if (claim === "too_strong" && gap >= SIGNIFICANT_GAP) return "confirmed";
  if (claim === "too_weak" && gap <= -SIGNIFICANT_GAP) return "confirmed";
  return "contradicted";
}

// Nombres écrits dans un texte : "61,3 %" et "61.3" donnent tous deux 61.3
export function citedNumbers(text: string): number[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
}

// Une explication n'a le droit de citer que les chiffres des preuves et les seuils
export function onlyUsesEvidenceNumbers(text: string, evidence: Evidence): boolean {
  const allowed = new Set([
    evidence.runs,
    evidence.winRate,
    evidence.categoryAverage,
    Math.abs(evidence.gap),
    MIN_RUNS,
    SIGNIFICANT_GAP,
  ]);
  return citedNumbers(text).every((n) => allowed.has(n));
}
