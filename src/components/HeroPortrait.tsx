// Portrait pixel art d'un héros du jeu (public/heroes), ou son initiale s'il n'a pas encore de portrait

const PORTRAITS = new Set([
  "alchimiste", "astrologue", "banquier", "baron", "chevalier", "dame-pique", "dauphin", "drago", "duelliste",
  "ecuyer", "faucheuse", "goule", "heraut", "joaillier", "joker", "liche", "mage", "marchand", "mercenaire",
  "necromancien", "oracle", "paladin", "prince", "reine", "sorciere", "sosie", "tricheur", "usurier", "vampire",
]);

export default function HeroPortrait({ id, name, size = 40 }: { id: string; name: string; size?: number }) {
  const frame = "inline-grid shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[#1a0d1f]";

  if (!PORTRAITS.has(id)) {
    return (
      <span
        aria-hidden
        className={`${frame} font-[family-name:var(--font-jersey)] text-[var(--gold)]`}
        style={{ width: size, height: size, fontSize: size * 0.6 }}
      >
        {name.charAt(0)}
      </span>
    );
  }

  return (
    <span className={frame} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- pixel art de 48 px, à agrandir sans lissage */}
      <img src={`/heroes/${id}.png`} alt="" width={size} height={size} className="pixel h-full w-full" />
    </span>
  );
}
