"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BetaRequestForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [motivation, setMotivation] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const isValid = username.trim().length >= 2 && username.trim().length <= 20 && consent;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, motivation, consent }),
      });
      const data = await response.json();

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
    <form onSubmit={submit}>
      <div>
        <label htmlFor="username">Pseudo souhaité dans le jeu</label>
        <br />
        <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
      </div>
      <div>
        <label htmlFor="motivation">Pourquoi veux-tu tester Runejack ? (facultatif)</label>
        <br />
        <textarea
          id="motivation"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          maxLength={500}
          rows={5}
          cols={60}
        />
      </div>
      <label>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        J&apos;accepte que mon adresse e-mail serve à m&apos;inviter dans la bêta et à me contacter à son sujet.
      </label>
      <br />
      <button type="submit" disabled={!isValid || sending}>
        {sending ? "Envoi…" : "Demander l'accès"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
