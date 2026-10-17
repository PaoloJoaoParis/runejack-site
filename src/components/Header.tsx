import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import NavLinks, { type NavLink } from "@/components/NavLinks";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const links: NavLink[] = [
    { href: "/meta", label: "Méta" },
    { href: "/beta", label: "Bêta" },
    ...(user
      ? [
          { href: "/retours/nouveau", label: "Envoyer un retour" },
          { href: "/retours", label: "Mes retours" },
          { href: "/mes-stats", label: "Mes stats" },
          ...(isAdmin(user) ? [{ href: "/admin", label: "Admin" }] : []),
        ]
      : []),
  ];

  return (
    <header className="sticky top-3 z-50 px-3">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(20,10,26,0.72)] px-4 py-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <Link
          href="/"
          className="mr-auto flex items-center gap-2 font-[family-name:var(--font-jersey)] text-3xl leading-none text-[var(--gold-light)] no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel */}
          <img src="/logo.svg" alt="" width={28} height={28} />
          Runejack
        </Link>
        <NavLinks links={links} />
        {user ? (
          <LogoutButton />
        ) : (
          <Link href="/connexion" className="btn px-4! py-2! text-sm">
            Se connecter
          </Link>
        )}
      </nav>
    </header>
  );
}
