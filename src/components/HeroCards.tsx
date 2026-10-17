"use client";

import { motion } from "motion/react";

// Éventail de trois cartes de héros qui flottent, comme une main de blackjack
const CARDS = [
  { id: "dame-pique", name: "Dame de pique", suit: "♠", rotate: -14, x: -140, delay: 0 },
  { id: "reine", name: "Reine", suit: "♥", rotate: 0, x: 0, delay: 0.4 },
  { id: "liche", name: "Liche", suit: "♣", rotate: 14, x: 140, delay: 0.8 },
];

export default function HeroCards() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px] scale-[0.72] sm:scale-100" aria-hidden>
      {/* Halo doré derrière la main */}
      <div className="absolute inset-x-10 top-10 bottom-0 rounded-full bg-[radial-gradient(circle,rgba(224,184,74,0.35),transparent_65%)] blur-2xl" />
      {CARDS.map((card, index) => (
        <motion.div
          key={card.id}
          className="absolute top-6 left-1/2 -ml-[78px]"
          style={{ zIndex: index === 1 ? 3 : 2 }}
          initial={{ opacity: 0, y: 60, rotate: 0, x: 0 }}
          animate={{ opacity: 1, y: 0, rotate: card.rotate, x: card.x }}
          transition={{ duration: 0.9, delay: 0.2 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: card.delay }}
            whileHover={{ y: -22, scale: 1.05 }}
            className="relative flex h-[220px] w-[156px] flex-col justify-between overflow-hidden rounded-2xl border-2 border-[var(--gold)] bg-[linear-gradient(160deg,#3a1f48,#1a0d1f_70%)] p-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            {/* Reflet irisé qui traverse la carte */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,228,138,0.18)_45%,rgba(185,139,255,0.15)_55%,transparent_70%)]" />
            <span className="font-[family-name:var(--font-jersey)] text-3xl leading-none text-[var(--gold-light)]">
              {card.suit}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element -- pixel art à agrandir sans lissage */}
            <img src={`/heroes/${card.id}.png`} alt="" width={112} height={112} className="pixel mx-auto" />
            <span className="text-center font-[family-name:var(--font-jersey)] text-2xl leading-none text-[var(--foreground)]">
              {card.name}
            </span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
