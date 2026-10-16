export type Status = "operational" | "degraded" | "down";

export type CheckResult = {
  service: string;
  description: string;
  status: Status;
  latencyMs: number;
  message: string;
};

export type Check = {
  service: string;
  description: string;
  run: () => Promise<string>;
};

const TIMEOUT_MS = 5000;
const DEGRADED_THRESHOLD_MS = 2000;

export async function runCheck(check: Check): Promise<CheckResult> {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Aucune réponse après ${TIMEOUT_MS / 1000} secondes`)), TIMEOUT_MS);
  });

  try {
    const message = await Promise.race([check.run(), timeout]);
    const latencyMs = Date.now() - startedAt;
    return {
      service: check.service,
      description: check.description,
      status: latencyMs > DEGRADED_THRESHOLD_MS ? "degraded" : "operational",
      latencyMs,
      message,
    };
  } catch (error) {
    return {
      service: check.service,
      description: check.description,
      status: "down",
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Erreur inconnue",
    };
  } finally {
    clearTimeout(timer);
  }
}
