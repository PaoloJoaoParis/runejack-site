import Image from "next/image";
import Link from "next/link";
import { loadCatalog } from "@/lib/runejack";

async function countContent() {
  try {
    const catalog = await loadCatalog();
    return { heroes: catalog.hero.length, runes: catalog.rune.length, items: catalog.item.length };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const content = await countContent();

  return (
    <main>
      <section>
        <Image src="/logo.svg" alt="Logo de Runejack" width={160} height={160} priority />
        <h1>Runejack</h1>
        <p>
          Un roguelike de cartes où chaque main se joue avec des héros, des runes et des contrats. Construis ta table,
          survis aux croupiers, et grimpe les étages.
        </p>
        <Link href="/beta">Rejoindre la bêta</Link> · <Link href="/meta">Voir la meta</Link>
      </section>

      {content && (
        <section>
          <p>
            {content.heroes} héros · {content.runes} runes · {content.items} objets
          </p>
        </section>
      )}

      <section>
        <h2>Tu joues déjà ?</h2>
        <p>
          Un bug, un héros trop fort, une idée : envoie ton retour. Les retours d&apos;équilibrage sont comparés aux
          vraies statistiques du jeu.
        </p>
        <Link href="/retours/nouveau">Envoyer un retour</Link>
      </section>

      <footer>Un jeu Lappal</footer>
    </main>
  );
}
