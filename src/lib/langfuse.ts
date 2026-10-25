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

type OtlpAttribute = {
  key: string;
  value: { stringValue: string } | { arrayValue: { values: { stringValue: string }[] } };
};

const text = (key: string, value: string): OtlpAttribute => ({ key, value: { stringValue: value } });

// Identifiants au format OpenTelemetry : 32 caractères hexadécimaux pour une trace, 16 pour une étape.
// La trace reprend l'identifiant du retour : les deux appels au modèle d'une même analyse sont regroupés.
function traceIdFrom(id: string): string {
  const hex = id.replace(/-/g, "").toLowerCase();
  return /^[0-9a-f]{32}$/.test(hex) ? hex : randomHex(16);
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

const nanoseconds = (date: Date) => (BigInt(date.getTime()) * BigInt(1_000_000)).toString();

// Trace d'un appel au modèle, envoyée à Langfuse au format OpenTelemetry (OTLP/JSON).
// Langfuse n'accepte plus l'ancienne API d'ingestion pour les nouvelles organisations : seul ce format enregistre les traces.
// Chaque appel apparaît comme une « generation » avec son modèle, ses messages, ses tokens, sa latence et son coût.
export function traceGeneration(generation: Generation) {
  const baseUrl = process.env.LANGFUSE_BASE_URL;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  // L'observabilité est facultative : sans configuration, l'application fonctionne normalement
  if (!baseUrl || !publicKey || !secretKey) return;

  const { trace } = generation;
  const attributes: OtlpAttribute[] = [
    text("langfuse.observation.type", "generation"),
    text("langfuse.trace.name", trace.name),
    text("langfuse.environment", process.env.VERCEL_ENV ?? "local"),
    text("langfuse.observation.model.name", generation.model),
    text("langfuse.observation.input", JSON.stringify(generation.input)),
    text("langfuse.observation.level", generation.error ? "ERROR" : "DEFAULT"),
    { key: "langfuse.trace.tags", value: { arrayValue: { values: [{ stringValue: process.env.VERCEL_ENV ?? "local" }] } } },
  ];
  if (trace.userId) attributes.push(text("langfuse.user.id", trace.userId));
  if (generation.output !== undefined) attributes.push(text("langfuse.observation.output", JSON.stringify(generation.output)));
  if (generation.inputTokens !== undefined) {
    attributes.push(
      text(
        "langfuse.observation.usage_details",
        JSON.stringify({ input: generation.inputTokens, output: generation.outputTokens ?? 0 })
      )
    );
  }
  if (generation.error) attributes.push(text("langfuse.observation.status_message", generation.error));
  for (const [key, value] of Object.entries(trace.metadata ?? {})) {
    attributes.push(text(`langfuse.trace.metadata.${key}`, typeof value === "string" ? value : JSON.stringify(value)));
  }

  const body = {
    resourceSpans: [
      {
        resource: { attributes: [text("service.name", "runejack-site")] },
        scopeSpans: [
          {
            scope: { name: "runejack-site" },
            spans: [
              {
                traceId: traceIdFrom(trace.id),
                spanId: randomHex(8),
                name: "model-call",
                kind: 1,
                startTimeUnixNano: nanoseconds(generation.startedAt),
                endTimeUnixNano: nanoseconds(generation.endedAt),
                attributes,
                // Code OpenTelemetry : 1 = réussi, 2 = erreur
                status: generation.error ? { code: 2, message: generation.error } : { code: 1 },
              },
            ],
          },
        ],
      },
    ],
  };

  // Envoi après la réponse : l'observabilité ne doit jamais ralentir le traitement
  after(async () => {
    try {
      const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
      const response = await fetch(`${baseUrl}/api/public/otel/v1/traces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
          // Version 4 de l'ingestion : les traces apparaissent tout de suite dans Langfuse
          "x-langfuse-ingestion-version": "4",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        console.error(`Langfuse a refusé la trace (${response.status}) :`, await response.text());
      }
    } catch (error) {
      // Un échec d'envoi est journalisé, mais ne fait jamais échouer le traitement
      console.error("Envoi de la trace vers Langfuse impossible :", error);
    }
  });
}
