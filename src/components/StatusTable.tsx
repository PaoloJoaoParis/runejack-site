"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { HaloBadge } from "@/components/ui/halo-badge";
import type { CheckResult, Status } from "@/lib/status";

type StatusResponse = {
  checkedAt: string;
  overall: Status;
  services: CheckResult[];
};

const LABELS: Record<Status, string> = {
  operational: "Opérationnel",
  degraded: "Dégradé",
  down: "En panne",
};

const OVERALL_MESSAGE: Record<Status, string> = {
  operational: "Tous les services sont opérationnels.",
  degraded: "Au moins un service répond lentement.",
  down: "Au moins un service est en panne.",
};

const COLORS: Record<Status, string> = {
  operational: "var(--ok)",
  degraded: "var(--gold)",
  down: "var(--danger)",
};

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/admin/status", { cache: "no-store" });
  if (!response.ok) throw new Error(`Statut ${response.status}`);
  return response.json();
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <HaloBadge
      live={status !== "operational"}
      variant={status === "down" ? "destructive" : "outline"}
      rim={status === "operational" ? "success" : undefined}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: COLORS[status] }} />
      {LABELS[status]}
    </HaloBadge>
  );
}

export default function StatusTable() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function refresh() {
    setLoading(true);
    fetchStatus()
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch(() => setError("Impossible de joindre la route de statut."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchStatus()
      .then(setData)
      .catch(() => setError("Impossible de joindre la route de statut."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-3xl">Santé des services</h2>
        {data && <StatusBadge status={data.overall} />}
        <button onClick={refresh} disabled={loading} className="btn-ghost btn-sm">
          {loading ? "Vérification…" : "Relancer les tests"}
        </button>
      </div>

      {error && (
        <p role="alert" className="alert m-0">
          {error}
        </p>
      )}

      {data && (
        <>
          <p className="m-0">{OVERALL_MESSAGE[data.overall]}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.services.map((s, index) => (
              <motion.div
                key={s.service}
                className="glass flex flex-col gap-2 p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong>{s.service}</strong>
                  <StatusBadge status={s.status} />
                </div>
                <span className="text-sm text-[var(--muted-foreground)]">{s.description}</span>
                <span className="mt-auto flex justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                  <span className="truncate">{s.message}</span>
                  <span className="shrink-0 font-mono text-[var(--gold-light)] tabular-nums">{s.latencyMs} ms</span>
                </span>
              </motion.div>
            ))}
          </div>
          <p className="m-0 text-xs">Dernière vérification : {new Date(data.checkedAt).toLocaleString("fr-FR")}</p>
        </>
      )}
    </section>
  );
}
