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

// Accès à la bêta : ils s'ouvrent seuls à la demande. L'admin suit les derniers accès,
// et relance ceux que le jeu n'a pas pu ouvrir (jeu injoignable au moment de la demande).
export default function BetaRequests({ requests }: { requests: BetaRequest[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function retry(id: string) {
    setBusyId(id);
    setError("");
    const response = await fetch(`/api/admin/beta/${id}`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Une erreur est survenue.");
    setBusyId(null);
    router.refresh();
  }

  const failed = requests.filter((r) => r.status !== "accepted");
  const opened = requests.filter((r) => r.status === "accepted");
  const latest = opened.toSorted((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-3xl">Accès à la bêta</h2>
        <HaloBadge variant="outline" rim="success">
          {opened.length} accès ouvert(s)
        </HaloBadge>
        {failed.length > 0 && (
          <HaloBadge live variant="destructive">
            {failed.length} à relancer
          </HaloBadge>
        )}
      </div>
      <p className="m-0">L&apos;accès au jeu s&apos;ouvre automatiquement dès qu&apos;un joueur le demande.</p>

      {error && (
        <p role="alert" className="alert m-0">
          {error}
        </p>
      )}

      {/* Ouvertures en échec : le jeu n'a pas répondu, on relance */}
      <ul className="grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {failed.map((r) => (
            <motion.li
              key={r.id}
              layout
              className="glass flex flex-col gap-3 border-[rgba(255,122,138,0.35)]! p-5"
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
              <p className="m-0 text-sm">{r.error_message ?? "Accès pas encore ouvert."}</p>
              <button onClick={() => retry(r.id)} disabled={busyId !== null} className="btn btn-sm w-fit">
                {busyId === r.id ? "Ouverture…" : "Relancer l'ouverture"}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {latest.length > 0 && (
        <div className="glass overflow-x-auto">
          <table className="table-rune">
            <thead>
              <tr>
                <th>Pseudo</th>
                <th>E-mail</th>
                <th>Accès ouvert le</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((r) => (
                <tr key={r.id}>
                  <td className="text-[var(--foreground)]!">{r.desired_username}</td>
                  <td>{r.email}</td>
                  <td>{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
