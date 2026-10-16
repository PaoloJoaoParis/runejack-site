import Link from "next/link";
import FeedbackForm from "@/components/FeedbackForm";

export default function NewFeedbackPage() {
  return (
    <main>
      <h1>Envoyer un retour</h1>
      <Link href="/retours">Mes retours</Link>
      <p>
        Un bug, un héros trop fort, une idée ? L&apos;équipe lit tout. Une IA trie ton retour et, s&apos;il parle
        d&apos;équilibrage, le compare aux statistiques du jeu.
      </p>
      <FeedbackForm />
    </main>
  );
}
