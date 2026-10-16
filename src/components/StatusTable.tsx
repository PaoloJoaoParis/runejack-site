"use client";

import { useEffect, useState } from "react";
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

async function fetchStatus(): Promise<StatusResponse> {
  const response = await fetch("/api/admin/status", { cache: "no-store" });
  if (!response.ok) throw new Error(`Statut ${response.status}`);
  return response.json();
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
    <section>
      <h1>Administration</h1>
      <button onClick={refresh} disabled={loading}>
        {loading ? "Vérification…" : "Relancer les tests"}
      </button>

      {error && <p role="alert">{error}</p>}

      {data && (
        <>
          <p>{OVERALL_MESSAGE[data.overall]}</p>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Statut</th>
                <th>Temps de réponse</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((s) => (
                <tr key={s.service}>
                  <td>
                    {s.service}
                    <br />
                    {s.description}
                  </td>
                  <td>{LABELS[s.status]}</td>
                  <td>{s.latencyMs} ms</td>
                  <td>{s.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Dernière vérification : {new Date(data.checkedAt).toLocaleString("fr-FR")}</p>
        </>
      )}
    </section>
  );
}
