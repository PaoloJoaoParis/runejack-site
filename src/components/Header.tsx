import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 p-4 text-sm">
        <Link href="/" className="mr-auto text-lg font-bold">
          Runejack
        </Link>
        <Link href="/meta">Meta</Link>
        <Link href="/beta">Bêta</Link>
        {user ? (
          <>
            <Link href="/retours/nouveau">Envoyer un retour</Link>
            <Link href="/retours">Mes retours</Link>
            <Link href="/mes-stats">Mes stats</Link>
            {isAdmin(user) && <Link href="/admin">Admin</Link>}
            <LogoutButton />
          </>
        ) : (
          <Link href="/connexion" className="rounded bg-blue-600 px-3 py-1 text-white">
            Se connecter
          </Link>
        )}
      </nav>
    </header>
  );
}