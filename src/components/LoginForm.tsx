"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div
          key="sent"
          className="notice mt-6 flex items-start gap-3"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <span className="text-2xl leading-none">✉</span>
          <span>
            Un lien de connexion vient d&apos;être envoyé à <strong>{email}</strong>. Ouvre-le dans ce même navigateur.
          </span>
        </motion.div>
      ) : (
        <motion.form key="form" onSubmit={submit} className="mt-6 flex flex-col gap-4" exit={{ opacity: 0, y: -8 }}>
          <div>
            <label htmlFor="email" className="label">
              Adresse e-mail
            </label>
            <input
              id="email"
              className="field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com"
            />
          </div>
          <button type="submit" disabled={sending || email === ""} className="btn">
            {sending ? "Envoi en cours…" : "Recevoir un lien de connexion"}
          </button>
          {error && (
            <p role="alert" className="alert m-0">
              {error}
            </p>
          )}
        </motion.form>
      )}
    </AnimatePresence>
  );
}
