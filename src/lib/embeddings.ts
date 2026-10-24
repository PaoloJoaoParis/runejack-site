import "server-only";
import { normalize } from "@/lib/vectors";

// Embeddings calculés par l'API Gemini de Google (offre gratuite), côté serveur uniquement.
// Groq, le fournisseur du modèle de tri, ne propose pas d'embeddings.
export const EMBEDDING_DIMENSIONS = 768;
const TIMEOUT_MS = 8000;

export function embeddingModel(): string {
  return process.env.EMBEDDING_MODEL || "gemini-embedding-001";
}

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    throw new Error("Variable EMBEDDING_API_KEY manquante");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel()}:embedContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        // Tâche « similarité » : le vecteur sert à comparer deux textes entre eux
        taskType: "SEMANTIC_SIMILARITY",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`L'API d'embeddings a répondu avec le statut ${response.status}`);
  }

  // Réponse vérifiée : on ne range en base qu'un vecteur de la bonne taille
  const data = await response.json();
  const values: unknown = data.embedding?.values ?? data.embeddings?.[0]?.values;
  if (
    !Array.isArray(values) ||
    values.length !== EMBEDDING_DIMENSIONS ||
    !values.every((value) => typeof value === "number")
  ) {
    throw new Error("Réponse de l'API d'embeddings inattendue");
  }

  return normalize(values);
}
