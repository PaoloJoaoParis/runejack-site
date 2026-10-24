import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";
import PageHeader from "@/components/PageHeader";

export default function NewFeedbackPage() {
  return (
    <main className="max-w-4xl!">
      <PageHeader
        eyebrow="Retour joueur · trié par IA"
        title="Envoyer un retour"
        action={
          <Link href="/retours" className="btn-ghost btn-sm">
            Mes retours
          </Link>
        }
      >
        Un bug, un héros trop fort, une idée ? L&apos;équipe lit tout. Une IA trie ton retour en direct et, s&apos;il
        parle d&apos;équilibrage, le compare aux statistiques du jeu.
      </PageHeader>
      <FeedbackForm />
    </main>
  );
}
