"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Indexe les anciens retours pour la détection des doublons : appelle la route par lots
// jusqu'à ce qu'il n'en reste plus, en affichant la progression
export default function EmbeddingBackfill({ initialRemaining }: { initialRemaining: number }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(initialRemaining);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setRunning(true);
    setError("");
    try {
      let left = remaining;
      while (left > 0) {
        const response = await fetch("/api/admin/embeddings", { method: "POST" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(data.error ?? "L'indexation a échoué.");
          break;
        }
        // Rien n'a avancé (retours en échec à chaque fois) : on s'arrête au lieu de boucler
        if (data.processed === 0) break;
        left = data.remaining;
        setRemaining(left);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn btn-sm" onClick={run} disabled={running}>
        {running ? `Indexation… ${remaining} restant(s)` : `Indexer ${remaining} retour(s) pour les doublons`}
      </button>
      {error && (
        <span role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
