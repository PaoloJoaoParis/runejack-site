"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Relance l'ouverture de l'accès quand le jeu n'a pas répondu au moment de la demande
export default function BetaRetryButton() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retry: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button type="button" className="btn" onClick={retry} disabled={sending}>
        {sending ? "Ouverture…" : "Réessayer"}
      </button>
      {error && (
        <p role="alert" className="alert m-0">
          {error}
        </p>
      )}
    </div>
  );
}
