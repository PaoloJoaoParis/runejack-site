import Link from "next/link";

// Pied de page commun à toutes les pages
export default function Footer() {
  return (
    <footer className="mx-auto mt-auto w-full max-w-5xl px-4 pt-10 pb-8">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)] sm:flex-row">
        <Link
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-jersey)] text-2xl leading-none text-[var(--gold-light)] no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel */}
          <img src="/logo.svg" alt="" width={20} height={20} />
          Runejack
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-5">
          <Link href="/beta" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Bêta
          </Link>
          <Link href="/retours/nouveau" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Envoyer un retour
          </Link>
          <a href="https://play.runejack.com" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            play.runejack.com
          </a>
        </nav>
        <span>Un jeu Lappal</span>
      </div>
    </footer>
  );
}
