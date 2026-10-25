import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import NavLinks, { type NavLink } from "@/components/NavLinks";
import { isAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function Header() {
  const user = await getCurrentUser();

  const links: NavLink[] = [
    { href: "/beta", label: "Bêta" },
    ...(user
      ? [
          { href: "/retours/nouveau", label: "Envoyer un retour" },
          { href: "/retours", label: "Mes retours", exact: true },
          { href: "/mes-stats", label: "Mes stats" },
          ...(isAdmin(user) ? [{ href: "/admin", label: "Admin" }] : []),
        ]
      : []),
  ];

  return (
    // Nommé pour la transition entre les pages : il reste immobile pendant que le contenu change
    <header className="sticky top-3 z-50 px-3" style={{ viewTransitionName: "site-header" }}>
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(20,10,26,0.72)] px-4 py-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <Link
          href="/"
          className="group mr-auto flex items-center gap-2 font-[family-name:var(--font-jersey)] text-3xl leading-none text-[var(--gold-light)] no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel */}
          <img
            src="/logo.svg"
            alt=""
            width={28}
            height={28}
            className="transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
          />
          Runejack
        </Link>
        <NavLinks links={links} />
        {user ? (
          <LogoutButton />
        ) : (
          <Link href="/connexion" className="btn btn-sm">
            Se connecter
          </Link>
        )}
      </nav>
    </header>
  );
}
