import "server-only";
import { callModel } from "@/lib/ai";
import type { Claim, Evidence, Verdict } from "@/lib/feedback";
import type { TraceContext } from "@/lib/langfuse";
import { onlyUsesEvidenceNumbers } from "@/lib/verdict";

const SYSTEM_PROMPT = `Tu expliques à l'équipe de Runejack ce que disent les statistiques sur un retour d'équilibrage, en français.

Règles :
- Deux phrases au plus.
- N'utilise que les chiffres fournis, écrits tels quels. N'en calcule aucun autre.
- Le verdict est déjà décidé : explique-le, ne le remets pas en cause.`;

const EXPLANATION_SCHEMA = {
  name: "verdict_explanation",
  schema: {
    type: "object",
    properties: { explanation: { type: "string" } },
    required: ["explanation"],
    additionalProperties: false,
  },
};

const MAX_ATTEMPTS = 2;

// Phrase écrite par le serveur : toujours juste, utilisée si le modèle échoue
export function fallbackSentence(evidence: Evidence): string {
  return `${evidence.name} gagne ${evidence.winRate} % de ses runs (${evidence.runs} runs), contre ${evidence.categoryAverage} % en moyenne dans sa catégorie.`;
}

export async function explainVerdict(
  evidence: Evidence,
  verdict: Verdict,
  claim: Claim,
  trace?: TraceContext
): Promise<string> {
  const facts = {
    element: evidence.name,
    player_claim: claim,
    verdict,
    runs: evidence.runs,
    win_rate: evidence.winRate,
    category_average: evidence.categoryAverage,
    gap_in_points: evidence.gap,
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const answer = await callModel(
        [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(facts) },
        ],
        { schema: EXPLANATION_SCHEMA, trace }
      );
      const { explanation } = JSON.parse(answer) as { explanation?: unknown };

      if (typeof explanation === "string" && explanation.trim() && onlyUsesEvidenceNumbers(explanation, evidence)) {
        return explanation.trim().slice(0, 400);
      }
      console.warn(`Explication : tentative ${attempt} rejetée (format ou chiffre non fourni).`);
    } catch (error) {
      // Effet secondaire non critique : on journalise et on se rabat sur la phrase du serveur
      console.error("Explication du verdict impossible :", error);
      break;
    }
  }

  return fallbackSentence(evidence);
}
