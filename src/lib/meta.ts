import type { StatLine } from "@/lib/runejack";

export type Tier = "S" | "A" | "B" | "C";
export type RankedLine = StatLine & { tier: Tier; lowerBound: number };

export const META_MIN_RUNS = 30;

// Borne basse de l'intervalle de Wilson à 95 % : un taux mesuré sur peu de runs est tiré vers le bas.
// 70 % sur 20 runs passe ainsi derrière 60 % sur 400 runs.
export function wilsonLowerBound(wins: number, runs: number, z = 1.96): number {
  if (runs === 0) return 0;
  const p = wins / runs;
  const z2 = z * z;
  const center = p + z2 / (2 * runs);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * runs)) / runs);
  return (center - margin) / (1 + z2 / runs);
}

function tierForRank(rank: number, total: number): Tier {
  const position = rank / total;
  if (position < 0.1) return "S";
  if (position < 0.3) return "A";
  if (position < 0.7) return "B";
  return "C";
}

export function rankLines(lines: StatLine[]): { ranked: RankedLine[]; lowSample: StatLine[] } {
  const lowSample = lines.filter((line) => line.runs < META_MIN_RUNS);
  const sorted = lines
    .filter((line) => line.runs >= META_MIN_RUNS)
    .map((line) => ({ ...line, lowerBound: wilsonLowerBound((line.winRate / 100) * line.runs, line.runs) }))
    .sort((a, b) => b.lowerBound - a.lowerBound);

  const ranked = sorted.map((line, rank) => ({ ...line, tier: tierForRank(rank, sorted.length) }));
  return { ranked, lowSample };
}
