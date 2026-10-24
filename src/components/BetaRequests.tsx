"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { HaloBadge } from "@/components/ui/halo-badge";

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
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-3xl">Demandes bêta</h2>
        <HaloBadge live={pending.length > 0} variant="default">
          {pending.length} en attente
        </HaloBadge>
        {processed.length > 0 && (
          <span className="text-sm text-[var(--muted-foreground)]">
            {processed.filter((r) => r.status === "accepted").length} acceptée(s) ·{" "}
            {processed.filter((r) => r.status === "rejected").length} refusée(s)
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="alert m-0">
          {error}
        </p>
      )}
      {pending.length === 0 && <p className="m-0">Aucune demande en attente.</p>}

      <ul className="grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {pending.map((r) => (
            <motion.li
              key={r.id}
              layout
              className="glass flex flex-col gap-3 p-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div>
                <strong className="block font-[family-name:var(--font-jersey)] text-2xl font-normal text-[var(--gold-light)]">
                  {r.desired_username}
                </strong>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {r.email} · {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              {r.motivation && <p className="m-0 text-sm">« {r.motivation} »</p>}
              {r.error_message && (
                <p role="alert" className="alert m-0 text-sm">
                  {r.error_message}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-1">
                <button onClick={() => decide(r.id, "accept")} disabled={busyId !== null} className="btn btn-sm">
                  {busyId === r.id ? "Traitement…" : "Accepter"}
                </button>
                <button onClick={() => decide(r.id, "reject")} disabled={busyId !== null} className="btn-ghost btn-sm">
                  Refuser
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
