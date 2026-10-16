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
      <p className="mt-6 rounded border border-green-300 bg-green-50 p-4 text-green-800">
        Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Ouvre-le dans ce même navigateur.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="block font-medium">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.com"
          className="mt-1 w-full rounded border p-2"
        />
      </div>
      <button
        type="submit"
        disabled={sending || email === ""}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {sending ? "Envoi en cours…" : "Recevoir un lien de connexion"}
      </button>
      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}
    </form>
  );
}