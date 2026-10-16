import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const { erreur } = await searchParams;

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">Connexion</h1>
      <p className="mt-2 text-gray-600">
        Saisis ton adresse e-mail : tu recevras un lien pour te connecter, sans mot de passe.
      </p>
      <LoginForm invalidLink={erreur === "lien-invalide"} />
    </main>
  );
}