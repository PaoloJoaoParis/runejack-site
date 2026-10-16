import "server-only";
import type { User } from "@supabase/supabase-js";

// Le rôle est posé en SQL dans app_metadata : l'utilisateur ne peut pas se l'attribuer.
// La fonction SQL public.is_admin() lit le même champ, pour la Row Level Security.
export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}