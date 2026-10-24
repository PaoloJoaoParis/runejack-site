import Link from "next/link";

// Page introuvable, ou retour d'un autre joueur (la RLS ne le renvoie pas : on répond 404)
export default function NotFound() {
  return (
    <main className="grid min-h-[60vh] place-items-center">
      <div className="glass fade-up flex max-w-lg flex-col items-center gap-5 p-8 text-center">
        <span className="font-[family-name:var(--font-jersey)] text-8xl leading-none text-[var(--gold-light)]">
          404
        </span>
        <h1 className="m-0! text-4xl!">Cette carte n&apos;est pas dans le paquet</h1>
        <p className="m-0">La page demandée n&apos;existe pas, ou elle ne t&apos;appartient pas.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn">
            Accueil
          </Link>
          <Link href="/retours" className="btn-ghost">
            Mes retours
          </Link>
        </div>
      </div>
    </main>
  );
}
