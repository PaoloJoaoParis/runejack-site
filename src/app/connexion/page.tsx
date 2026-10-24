import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import SpotlightCard from "@/components/SpotlightCard";
import { getCurrentUser } from "@/lib/supabase/user";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const { erreur } = await searchParams;

  return (
    <main className="max-w-md! pt-16!">
      <SpotlightCard className="fade-up p-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel */}
        <img src="/logo.svg" alt="" width={44} height={44} className="mb-5" />
        <h1>Connexion</h1>
        <p>Saisis ton adresse e-mail : tu recevras un lien pour te connecter, sans mot de passe.</p>
        <LoginForm invalidLink={erreur === "lien-invalide"} />
      </SpotlightCard>
    </main>
  );
}
