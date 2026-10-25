import Link from "next/link";
import BetaRequestForm from "@/components/BetaRequestForm";
import BetaRetryButton from "@/components/BetaRetryButton";
import HeroCards from "@/components/HeroCards";
import PageHeader from "@/components/PageHeader";
import { BorderBeamCard } from "@/components/ui/border-beam-card";
import { HaloBadge } from "@/components/ui/halo-badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

// Page publique : tout le monde peut la lire. La demande, elle, demande d'être connecté,
// et ouvre l'accès au jeu immédiatement, sans validation par l'équipe.
export default async function BetaPage() {
  const user = await getCurrentUser();

  const betaRequest = user
    ? (
        await (await createSupabaseServerClient())
          .from("beta_requests")
          .select("status, desired_username, created_at, error_message")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data
    : null;

  return (
    <main>
      <PageHeader eyebrow="Accès immédiat" title="Bêta de Runejack">
        Demande ton accès : il s&apos;ouvre tout de suite, sans attente.
        {user && (
          <>
            {" "}
            Ton compte de jeu utilisera l&apos;adresse <strong>{user.email}</strong>.
          </>
        )}
      </PageHeader>

      <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {!user && (
            <div className="glass flex flex-col items-start gap-4 p-6 sm:p-8">
              <p className="m-0 text-lg">
                Connecte-toi avec ton adresse e-mail, choisis ton pseudo, et ton accès au jeu s&apos;ouvre aussitôt.
              </p>
              <Link href="/connexion" className="btn">
                Se connecter pour jouer
              </Link>
            </div>
          )}

          {user && !betaRequest && (
            <div className="glass p-6 sm:p-8">
              <BetaRequestForm />
            </div>
          )}

          {/* Demande enregistrée mais le jeu n'a pas répondu : le joueur peut relancer l'ouverture */}
          {user && betaRequest && betaRequest.status !== "accepted" && (
            <div className="glass flex flex-col items-start gap-4 p-6 sm:p-8">
              <HaloBadge live variant="default">
                Ouverture en cours
              </HaloBadge>
              <p className="m-0 text-lg">
                Ta demande est enregistrée, mais ton accès n&apos;a pas encore pu être ouvert : le jeu n&apos;a pas
                répondu.
              </p>
              <BetaRetryButton />
            </div>
          )}

          {user && betaRequest?.status === "accepted" && (
            <BorderBeamCard theme="dark" colorVariant="gold" cardClassName="glass border-0! bg-transparent! py-0!">
              <div className="flex flex-col gap-5 p-6 sm:p-8">
                <HaloBadge variant="outline" rim="success">
                  Accès ouvert
                </HaloBadge>
                <h2 className="m-0 text-4xl">Tu es dans la bêta !</h2>
                <p className="m-0">
                  Ce bouton ouvre le jeu déjà connecté avec {user.email}, sans nouvelle inscription.
                </p>
                {/* Un simple lien, pas <Link> : /jouer fabrique un jeton de connexion, rien à précharger */}
                <a href="/jouer" className="btn w-fit">
                  Jouer à Runejack →
                </a>
              </div>
            </BorderBeamCard>
          )}
        </div>

        <div className="hidden lg:block">
          <HeroCards />
        </div>
      </div>
    </main>
  );
}
