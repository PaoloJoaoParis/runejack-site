"use client";

import { useEffect } from "react";
import Link from "next/link";
import AiOrb from "@/components/AiOrb";

// Erreur inattendue dans une page : message clair pour le joueur, jamais de page blanche ni de détail technique.
// L'identifiant (digest) permet de retrouver l'erreur dans les journaux de Vercel sans rien exposer.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <main className="grid min-h-[60vh] place-items-center">
      <div className="glass fade-up flex max-w-lg flex-col items-center gap-5 p-8 text-center">
        <AiOrb state="error" size={72} />
        <h1 className="m-0! text-5xl!">Oups, une mauvaise main</h1>
        <p className="m-0">
          Cette page n&apos;a pas pu s&apos;afficher. Ce n&apos;est pas de ta faute : réessaie dans un instant, ou
          reviens à l&apos;accueil.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="btn" onClick={() => retry()}>
            Réessayer
          </button>
          <Link href="/" className="btn-ghost">
            Accueil
          </Link>
        </div>
        {digest && <p className="m-0 text-xs">Code de l&apos;erreur : {digest}</p>}
      </div>
    </main>
  );
}
