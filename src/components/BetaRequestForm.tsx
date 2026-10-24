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
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <label htmlFor="username" className="label">
          Pseudo souhaité dans le jeu
        </label>
        <input
          id="username"
          className="field"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          placeholder="Entre 2 et 20 caractères"
        />
      </div>
      <div>
        <label htmlFor="motivation" className="label">
          Pourquoi veux-tu tester Runejack ?{" "}
          <span className="font-normal text-[var(--muted-foreground)]">(facultatif)</span>
        </label>
        <textarea
          id="motivation"
          className="field resize-y"
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          maxLength={500}
          rows={5}
        />
        <span className="mt-1 block text-right text-xs text-[var(--muted-foreground)]">{motivation.length} / 500</span>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--muted-foreground)]">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        J&apos;accepte que mon adresse e-mail serve à m&apos;inviter dans la bêta et à me contacter à son sujet.
      </label>
      <button type="submit" className="btn w-fit" disabled={!isValid || sending}>
        {sending ? "Envoi…" : "Demander l'accès"}
      </button>
      {error && (
        <p role="alert" className="alert m-0">
          {error}
        </p>
      )}
    </form>
  );
}
