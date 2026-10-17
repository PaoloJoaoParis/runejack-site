import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import SpotlightCard from "@/components/SpotlightCard";
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
    <main className="max-w-md! pt-16!">
      <SpotlightCard className="p-8">
        <h1>Connexion</h1>
        <p>Saisis ton adresse e-mail : tu recevras un lien pour te connecter, sans mot de passe.</p>
        <LoginForm invalidLink={erreur === "lien-invalide"} />
      </SpotlightCard>
    </main>
  );
}
