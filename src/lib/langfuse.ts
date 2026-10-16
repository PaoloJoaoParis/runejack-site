import "server-only";
import { after } from "next/server";

export type TraceContext = {
  id: string;
  name: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

type Generation = {
  trace: TraceContext;
  model: string;
  input: unknown;
  output?: unknown;
  startedAt: Date;
  endedAt: Date;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
};

export function traceGeneration(generation: Generation) {
  const baseUrl = process.env.LANGFUSE_BASE_URL;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  // L'observabilité est facultative : sans configuration, l'application fonctionne normalement
  if (!baseUrl || !publicKey || !secretKey) return;

  const now = new Date().toISOString();

  const batch = [
    {
      id: crypto.randomUUID(),
      timestamp: now,
      type: "trace-create",
      body: {
        id: generation.trace.id,
        name: generation.trace.name,
        userId: generation.trace.userId,
        metadata: generation.trace.metadata,
        tags: [process.env.VERCEL_ENV ?? "local"],
      },
    },
    {
      id: crypto.randomUUID(),
      timestamp: now,
      type: "generation-create",
      body: {
        id: crypto.randomUUID(),
        traceId: generation.trace.id,
        name: "model-call",
        model: generation.model,
        input: generation.input,
        output: generation.output,
        startTime: generation.startedAt.toISOString(),
        endTime: generation.endedAt.toISOString(),
        usageDetails:
          generation.inputTokens !== undefined
            ? { input: generation.inputTokens, output: generation.outputTokens ?? 0 }
            : undefined,
        level: generation.error ? "ERROR" : "DEFAULT",
        statusMessage: generation.error,
      },
    },
  ];

  // Envoi après la réponse : l'observabilité ne doit jamais ralentir le traitement
  after(async () => {
    try {
      const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
      const response = await fetch(`${baseUrl}/api/public/ingestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
        body: JSON.stringify({ batch }),
      });
      if (!response.ok) {
        console.error(`Langfuse a refusé les traces (${response.status}) :`, await response.text());
      }
    } catch (error) {
      // Un échec d'envoi est journalisé, mais ne fait jamais échouer le traitement
      console.error("Envoi des traces vers Langfuse impossible :", error);
    }
  });
}
