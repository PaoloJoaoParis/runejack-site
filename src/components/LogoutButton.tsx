"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <button onClick={logout} aria-pressed="false" className="m-0! px-3! py-1.5! text-sm">
      Se déconnecter
    </button>
  );
}