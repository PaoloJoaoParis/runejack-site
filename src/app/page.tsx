import Link from "next/link";
import AiTriageDemo from "@/components/AiTriageDemo";
import CountUp from "@/components/CountUp";
import HeroCards from "@/components/HeroCards";
import Reveal from "@/components/Reveal";
import SpotlightCard from "@/components/SpotlightCard";
import { BorderBeamCard } from "@/components/ui/border-beam-card";
import { HaloBadge } from "@/components/ui/halo-badge";
import { Typewriter } from "@/components/ui/typewriter";
import { loadCatalog } from "@/lib/runejack";

async function countContent() {
  try {
    const catalog = await loadCatalog();
    return { heroes: catalog.hero.length, runes: catalog.rune.length, items: catalog.item.length };
  } catch {
    return null;
  }
}

const STEPS = [
  {
    number: "01",
    title: "Tu écris ton retour",
    text: "Un bug, un héros trop fort, une idée. Ajoute une capture si tu veux.",
  },
  {
    number: "02",
    title: "L'IA le trie",
    text: "Catégorie, gravité, étapes pour reproduire : ton retour est classé en quelques secondes.",
  },
  {
    number: "03",
    title: "Les stats tranchent",
    text: "S'il parle d'équilibrage, l'IA le confronte aux vraies statistiques des runs.",
  },
];

const FEATURES = [
  {
    icon: "✉",
    title: "Tes retours, triés par IA",
    text: "Suis l'analyse de chaque retour en direct, puis son traitement par l'équipe.",
    href: "/retours/nouveau",
    cta: "Envoyer un retour",
  },
  {
    icon: "♛",
    title: "Tes statistiques",
    text: "Tes héros, tes builds, tes pactes et tes dernières runs, réunis au même endroit.",
    href: "/mes-stats",
    cta: "Mes stats",
  },
  {
    icon: "✦",
    title: "La bêta",
    text: "Demande ton accès : il s'ouvre aussitôt, avec la même adresse que sur le site, sans inscription.",
    href: "/beta",
    cta: "Rejoindre la bêta",
  },
];

export default async function HomePage() {
  const content = await countContent();

  return (
    <main>
      <section className="grid items-center gap-10 py-8 md:grid-cols-[1.1fr_1fr] md:py-14">
        {/* Animation en CSS : le texte principal reste visible même avant le chargement du JavaScript */}
        <div className="fade-up">
          <HaloBadge live variant="outline" className="mb-5">
            Bêta ouverte · accès immédiat
          </HaloBadge>
          <h1 className="shimmer mb-4! text-[clamp(4rem,11vw,7.5rem)]!">Runejack</h1>
          <p className="max-w-xl text-lg">
            Un roguelike de blackjack où chaque main se joue avec des héros, des runes et des contrats. Construis ta
            table, survis aux croupiers, et grimpe les étages jusqu&apos;au Fond.
          </p>
          <p className="mt-4 min-h-7 font-mono text-sm text-[var(--gold-light)]">
            <Typewriter
              delay={0.8}
              baseText="Ton retour : "
              texts={[
                "« la Liche est trop forte au Fond »",
                "« le jeu plante pendant un Banco »",
                "« un défi quotidien, ce serait top »",
              ]}
            />
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/beta" className="btn">
              Rejoindre la bêta →
            </Link>
            <a href="#ia" className="btn-ghost">
              Voir l&apos;IA en action
            </a>
          </div>
        </div>
        <HeroCards />
      </section>

      {content && (
        <Reveal>
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { value: content.heroes, label: "héros à recruter" },
              { value: content.runes, label: "runes à graver" },
              { value: content.items, label: "objets à équiper" },
            ].map((stat) => (
              <SpotlightCard key={stat.label} className="p-6 text-center">
                <span className="block font-[family-name:var(--font-jersey)] text-6xl leading-none text-[var(--gold-light)]">
                  <CountUp value={stat.value} />
                </span>
                <span className="text-[var(--muted-foreground)]">{stat.label}</span>
              </SpotlightCard>
            ))}
          </section>
        </Reveal>
      )}

      <section id="ia" className="mt-24 grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <span className="eyebrow">Retours joueurs · IA</span>
          <h2 className="mb-4 text-5xl">
            Ton avis, <span className="iris-text">analysé en direct</span>
          </h2>
          <p className="text-lg">
            Chaque retour passe par une IA qui le classe, résume le problème et, quand il parle d&apos;équilibrage, le
            compare aux statistiques réelles du jeu. L&apos;équipe reçoit un retour déjà trié, toi un verdict clair.
          </p>
          <ol className="mt-8 flex flex-col gap-5">
            {STEPS.map((step) => (
              <li key={step.number} className="flex gap-4">
                <span className="font-[family-name:var(--font-jersey)] text-3xl leading-none text-[var(--gold)]">
                  {step.number}
                </span>
                <span>
                  <strong className="block">{step.title}</strong>
                  <span className="text-[var(--muted-foreground)]">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.15}>
          <AiTriageDemo />
        </Reveal>
      </section>

      <section className="mt-24">
        <Reveal className="mb-8 text-center">
          <span className="eyebrow">Ton espace joueur</span>
          <h2 className="text-5xl">Tout Runejack, au même endroit</h2>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.1} className="h-full">
              <SpotlightCard className="group flex h-full flex-col p-6 hover:-translate-y-1">
                <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl border border-[var(--border-strong)] bg-[rgba(224,184,74,0.1)] text-2xl text-[var(--gold-light)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  {feature.icon}
                </span>
                <h3 className="mb-2 font-[family-name:var(--font-jersey)] text-3xl font-normal text-[var(--gold-light)]">
                  {feature.title}
                </h3>
                <p className="mb-4 flex-1">{feature.text}</p>
                <Link href={feature.href} className="font-semibold no-underline">
                  {feature.cta} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal className="mt-24">
        <BorderBeamCard
          theme="dark"
          colorVariant="gold"
          cardClassName="glass border-0! bg-transparent! py-0!"
        >
          <div className="flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div>
              <h2 className="mb-2 text-4xl">Prêt à tirer ta première main ?</h2>
              <p className="m-0">Demande ton accès : il s&apos;ouvre tout de suite, sans attente.</p>
            </div>
            <Link href="/beta" className="btn shrink-0">
              Demander l&apos;accès
            </Link>
          </div>
        </BorderBeamCard>
      </Reveal>
    </main>
  );
}
