"use client";

import { motion, useReducedMotion } from "motion/react";
import { AiBlobWarpAvatar } from "@/components/ui/ai-blob-warp";

// États de l'assistant : il attend, il écoute le joueur taper, il analyse, il a fini, ou il a échoué
export type OrbState = "idle" | "listening" | "thinking" | "done" | "error";

// Formes organiques successives : l'orbe se déforme comme une goutte (morphisme)
const BLOB_SHAPES = [
  "63% 37% 54% 46% / 55% 48% 52% 45%",
  "40% 60% 70% 30% / 50% 60% 40% 50%",
  "68% 32% 42% 58% / 38% 62% 38% 62%",
  "35% 65% 55% 45% / 62% 35% 65% 38%",
  "63% 37% 54% 46% / 55% 48% 52% 45%",
];

const SETTINGS: Record<OrbState, { speed: number; morph: number; scale: number[]; glow: string }> = {
  idle: { speed: 0.6, morph: 9, scale: [1, 1.02, 1], glow: "rgba(185,139,255,0.35)" },
  listening: { speed: 2, morph: 4, scale: [1, 1.06, 1], glow: "rgba(224,184,74,0.45)" },
  thinking: { speed: 4.5, morph: 2.2, scale: [1, 1.1, 0.96, 1], glow: "rgba(224,184,74,0.7)" },
  done: { speed: 0.4, morph: 12, scale: [1, 1.01, 1], glow: "rgba(126,232,184,0.45)" },
  error: { speed: 0.3, morph: 14, scale: [1], glow: "rgba(255,122,138,0.4)" },
};

export default function AiOrb({ state, size = 64 }: { state: OrbState; size?: number }) {
  const reduceMotion = useReducedMotion();
  const settings = SETTINGS[state];
  const thinking = state === "thinking";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      {/* Halo qui respire, plus fort quand l'IA réfléchit */}
      <motion.div
        className="absolute -inset-3 rounded-full blur-xl"
        animate={{
          backgroundColor: settings.glow,
          opacity: reduceMotion ? 0.6 : thinking ? [0.5, 1, 0.5] : [0.4, 0.6, 0.4],
        }}
        transition={{ duration: thinking ? 1.4 : 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ondes qui partent de l'orbe pendant l'analyse */}
      {thinking &&
        !reduceMotion &&
        [0, 0.6, 1.2].map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-0 rounded-full border border-[var(--gold)]"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, delay, ease: "easeOut" }}
          />
        ))}

      {/* La goutte elle-même : forme qui ondule et shader irisé à l'intérieur */}
      <motion.div
        className="relative h-full w-full overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_30px_-6px_rgba(0,0,0,0.8)]"
        animate={
          reduceMotion
            ? { borderRadius: "50%" }
            : { borderRadius: BLOB_SHAPES, scale: settings.scale, rotate: thinking ? [0, 360] : 0 }
        }
        transition={{
          borderRadius: { duration: settings.morph, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: thinking ? 1.2 : 4, repeat: Infinity, ease: "easeInOut" },
          rotate: thinking ? { duration: 6, repeat: Infinity, ease: "linear" } : { duration: 0.8 },
        }}
      >
        <AiBlobWarpAvatar
          className="size-full rounded-none border-0"
          warpProps={{
            speed: settings.speed,
            ...(state === "error" && { colors: ["#ff7a8a", "#6d5876", "#b98bff", "#3a2244"] }),
            ...(state === "done" && { colors: ["#7ee8b8", "#e0b84a", "#b98bff", "#ffe48a"] }),
          }}
        />
        {/* Reflet de verre sur le dessus */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.45),transparent_45%)]" />
      </motion.div>
    </div>
  );
}
