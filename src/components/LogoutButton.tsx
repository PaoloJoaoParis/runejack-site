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
    <button onClick={logout} className="text-blue-600 underline">
      Se déconnecter
    </button>
  );
}