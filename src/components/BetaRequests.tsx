"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type BetaRequest = {
  id: string;
  email: string;
  desired_username: string;
  motivation: string;
  status: "pending" | "accepted" | "rejected";
  error_message: string | null;
  created_at: string;
};

export default function BetaRequests({ requests }: { requests: BetaRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function decide(id: string, decision: "accept" | "reject") {
    setBusyId(id);
    setError("");
    const response = await fetch(`/api/admin/beta/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Une erreur est survenue.");
    setBusyId(null);
    router.refresh();
  }

  const pending = requests.filter((r) => r.status === "pending");
  const processed = requests.filter((r) => r.status !== "pending");

  return (
    <section>
      <h2>Demandes bêta</h2>
      {error && <p role="alert">{error}</p>}
      {pending.length === 0 && <p>Aucune demande en attente.</p>}

      <ul>
        {pending.map((r) => (
          <li key={r.id}>
            <p>
              {r.desired_username} · {r.email}
            </p>
            {r.motivation && <p>{r.motivation}</p>}
            {r.error_message && <p>{r.error_message}</p>}
            <button onClick={() => decide(r.id, "accept")} disabled={busyId !== null}>
              {busyId === r.id ? "Traitement…" : "Accepter"}
            </button>{" "}
            <button onClick={() => decide(r.id, "reject")} disabled={busyId !== null}>
              Refuser
            </button>
          </li>
        ))}
      </ul>

      {processed.length > 0 && (
        <p>
          {processed.filter((r) => r.status === "accepted").length} acceptée(s),{" "}
          {processed.filter((r) => r.status === "rejected").length} refusée(s).
        </p>
      )}
    </section>
  );
}
