import "server-only";
import { traceGeneration, type TraceContext } from "@/lib/langfuse";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

export class AiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callModel(
  messages: Message[],
  options: { schema?: JsonSchema; trace?: TraceContext } = {}
): Promise<string> {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new AiError("La configuration du modèle d'IA est incomplète.", 500);
  }

  const startedAt = new Date();

  // Transmet l'appel à Langfuse, s'il fait partie d'une trace
  function report(details: { output?: unknown; inputTokens?: number; outputTokens?: number; error?: string }) {
    if (!options.trace) return;
    traceGeneration({ trace: options.trace, model: model!, input: messages, startedAt, endedAt: new Date(), ...details });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        ...(options.schema && {
          response_format: {
            type: "json_schema",
            json_schema: { name: options.schema.name, strict: true, schema: options.schema.schema },
          },
        }),
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    report({ error: error instanceof Error ? error.message : "Erreur réseau" });
    throw error;
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Erreur du modèle d'IA (${response.status}) : ${detail}`);
    report({ error: `Statut ${response.status} : ${detail}` });
    throw new AiError("Le modèle d'IA a renvoyé une erreur.", response.status);
  }

  const data = await response.json();
  const content: string = data.choices[0].message.content;

  report({
    output: content,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  });

  return content;
}

// Message lisible par le joueur ; le détail technique reste dans les journaux
export function aiErrorMessage(error: unknown): string {
  if (error instanceof AiError && error.status === 429) {
    return "Le service d'IA est momentanément saturé.";
  }
  if (error instanceof AiError && error.status === 413) {
    return "Le retour est trop long pour le service d'IA.";
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "Le service d'IA a mis trop de temps à répondre.";
  }
  return "L'analyse automatique du retour a échoué.";
}
