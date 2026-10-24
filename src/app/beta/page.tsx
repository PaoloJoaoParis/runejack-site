import BetaRequestForm from "@/components/BetaRequestForm";
import HeroCards from "@/components/HeroCards";
import PageHeader from "@/components/PageHeader";
import { HaloBadge } from "@/components/ui/halo-badge";
import { BorderBeamCard } from "@/components/ui/border-beam-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

export const dynamic = "force-dynamic";

export default async function BetaPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  const { data: betaRequest } = await supabase
    .from("beta_requests")
    .select("status, desired_username, created_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main>
      <PageHeader eyebrow="Accès anticipé" title="Bêta privée de Runejack">
        Les places sont limitées et l&apos;équipe ouvre la bêta par vagues. Ton compte de jeu utilisera l&apos;adresse{" "}
        <strong>{user!.email}</strong>.
      </PageHeader>

      <div className="grid items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          {!betaRequest && (
            <div className="glass p-6 sm:p-8">
              <BetaRequestForm />
            </div>
          )}

          {betaRequest?.status === "pending" && (
            <div className="glass flex flex-col gap-4 p-6 sm:p-8">
              <HaloBadge live variant="default">
                En cours d&apos;examen
              </HaloBadge>
              <p className="m-0 text-lg">
                Ta demande du {new Date(betaRequest.created_at).toLocaleDateString("fr-FR")} est en cours
                d&apos;examen. Tu recevras un e-mail dès qu&apos;elle sera acceptée.
              </p>
            </div>
          )}

          {betaRequest?.status === "accepted" && (
            <BorderBeamCard theme="dark" colorVariant="gold" cardClassName="glass border-0! bg-transparent! py-0!">
              <div className="flex flex-col gap-5 p-6 sm:p-8">
                <HaloBadge variant="outline" rim="success">
                  Accès accordé
                </HaloBadge>
                <h2 className="m-0 text-4xl">Tu es dans la bêta !</h2>
                <p className="m-0">
                  Ce bouton ouvre le jeu déjà connecté avec {user!.email}, sans nouvelle inscription.
                </p>
                {/* Un simple lien, pas <Link> : /jouer fabrique un jeton de connexion, rien à précharger */}
                <a href="/jouer" className="btn w-fit">
                  Jouer à Runejack →
                </a>
              </div>
            </BorderBeamCard>
          )}

          {betaRequest?.status === "rejected" && (
            <div className="glass flex flex-col gap-4 p-6 sm:p-8">
              <HaloBadge variant="secondary">Pas cette fois</HaloBadge>
              <p className="m-0 text-lg">Ta demande n&apos;a pas été retenue pour cette vague. Merci de ton intérêt !</p>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <HeroCards />
        </div>
      </div>
    </main>
  );
}
