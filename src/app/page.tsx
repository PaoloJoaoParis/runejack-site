import Link from "next/link";
import HeroCards from "@/components/HeroCards";
import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import { loadCatalog } from "@/lib/runejack";

async function countContent() {
  try {
    const catalog = await loadCatalog();
    return { heroes: catalog.hero.length, runes: catalog.rune.length, items: catalog.item.length };
  } catch {
    return null;
  }
}

const FEATURES = [
  {
    icon: "✦",
    title: "Une méta mesurée",
    text: "Tier list tirée des vraies runs des joueurs, complétée par des millions de tirages simulés.",
    href: "/meta",
    cta: "Voir la méta",
  },
  {
    icon: "✉",
    title: "Tes retours, triés par IA",
    text: "Un bug, un héros trop fort ? L'IA classe ton retour et le confronte aux statistiques du jeu.",
    href: "/retours/nouveau",
    cta: "Envoyer un retour",
  },
  {
    icon: "♛",
    title: "Tes statistiques",
    text: "Tes héros, tes builds et tes pactes, comparés à ce que la méta conseille.",
    href: "/mes-stats",
    cta: "Mes stats",
  },
];

export default async function HomePage() {
  const content = await countContent();

  return (
    <main>
      <section className="grid items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:py-16">
        {/* Animation en CSS : le texte principal reste visible même avant le chargement du JavaScript */}
        <div className="fade-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--ok)]" /> Bêta privée ouverte
          </p>
          <h1 className="shimmer text-[clamp(4rem,11vw,7.5rem)]!">Runejack</h1>
          <p className="max-w-xl text-lg">
            Un roguelike de blackjack où chaque main se joue avec des héros, des runes et des contrats. Construis ta
            table, survis aux croupiers, et grimpe les étages jusqu&apos;au Fond.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/beta" className="btn">
              Rejoindre la bêta →
            </Link>
            <Link href="/meta" className="btn-ghost">
              Voir la méta
            </Link>
          </div>
        </div>
        <HeroCards />
      </section>

      {content && (
        <Reveal>
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { value: content.heroes, label: "héros" },
              { value: content.runes, label: "runes" },
              { value: content.items, label: "objets" },
            ].map((stat) => (
              <SpotlightCard key={stat.label} className="p-6 text-center">
                <span className="block font-[family-name:var(--font-jersey)] text-6xl leading-none text-[var(--gold-light)]">
                  {stat.value}
                </span>
                <span className="text-[var(--muted)]">{stat.label}</span>
              </SpotlightCard>
            ))}
          </section>
        </Reveal>
      )}

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.1} className="h-full">
            <SpotlightCard className="flex h-full flex-col p-6">
              <span className="mb-4 grid h-12 w-12 place-items-center rounded-xl border border-[var(--border-strong)] bg-[rgba(224,184,74,0.1)] text-2xl text-[var(--gold-light)]">
                {feature.icon}
              </span>
              <h2 className="mt-0! mb-2! text-3xl!">{feature.title}</h2>
              <p className="flex-1">{feature.text}</p>
              <Link href={feature.href} className="font-semibold no-underline">
                {feature.cta} →
              </Link>
            </SpotlightCard>
          </Reveal>
        ))}
      </section>

      <Reveal>
        <SpotlightCard className="mt-16 flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="mt-0! mb-2!">Prêt à tirer ta première main ?</h2>
            <p className="m-0">Demande ton accès : l&apos;équipe ouvre la bêta par vagues.</p>
          </div>
          <Link href="/beta" className="btn shrink-0">
            Demander l&apos;accès
          </Link>
        </SpotlightCard>
      </Reveal>

      <footer className="mt-16 border-t border-[var(--border)] pt-6 text-center text-sm text-[var(--muted)]">
        Un jeu Lappal · <a href="https://play.runejack.com">play.runejack.com</a>
      </footer>
    </main>
  );
}
