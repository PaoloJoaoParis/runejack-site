"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm({ invalidLink }: { invalidLink: boolean }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    invalidLink ? "Ce lien de connexion est invalide ou a expiré. Demandes-en un nouveau." : ""
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");

    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setSending(false);

    if (error) {
      console.error(error);
      setError("L'envoi du lien a échoué. Patiente quelques minutes avant de réessayer.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-6 rounded-xl border border-[rgba(126,232,184,0.35)] bg-[rgba(126,232,184,0.08)] p-4 text-[var(--ok)]">
        Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Ouvre-le dans ce même navigateur.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.com"
        />
      </div>
      <button type="submit" disabled={sending || email === ""} className="justify-center">
        {sending ? "Envoi en cours…" : "Recevoir un lien de connexion"}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}