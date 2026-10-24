"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import {
  TerminalAnimationBlinkingCursor,
  TerminalAnimationCommandBar,
  TerminalAnimationContent,
  TerminalAnimationOutput,
  TerminalAnimationRoot,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
  TerminalAnimationTrailingPrompt,
  TerminalAnimationWindow,
  type TabContent,
} from "@/components/ui/terminal-animation";
import { AiBlobWarpAvatar } from "@/components/ui/ai-blob-warp";

// Démo du tri par IA : trois retours fictifs, analysés ligne par ligne comme dans un terminal
const TABS: TabContent[] = [
  {
    label: "Équilibrage",
    command: "triage « La Liche est beaucoup trop forte au Fond »",
    lines: [
      { text: "", delay: 80 },
      { text: "◆ Lecture du retour…", color: "text-[var(--iris)]", delay: 420 },
      { text: "  Catégorie   Équilibrage", color: "text-[var(--foreground)]", delay: 260 },
      { text: "  Gravité     Majeure", color: "text-[var(--foreground)]", delay: 160 },
      { text: "  Cible       Héros · Liche (trop fort)", color: "text-[var(--foreground)]", delay: 160 },
      { text: "", delay: 120 },
      { text: "◆ Comparaison aux statistiques du jeu…", color: "text-[var(--iris)]", delay: 520 },
      { text: "  Liche       61,2 % de victoires sur 1 284 runs", color: "text-[var(--muted-foreground)]", delay: 220 },
      { text: "  Moyenne     48,9 % pour les héros", color: "text-[var(--muted-foreground)]", delay: 160 },
      { text: "", delay: 120 },
      { text: "✔ Verdict : confirmé par les statistiques", color: "text-[var(--ok)]", delay: 360 },
    ],
  },
  {
    label: "Bug",
    command: "triage « Le jeu plante quand je vends un objet pendant un Banco »",
    lines: [
      { text: "", delay: 80 },
      { text: "◆ Lecture du retour…", color: "text-[var(--iris)]", delay: 420 },
      { text: "  Catégorie   Bug", color: "text-[var(--foreground)]", delay: 260 },
      { text: "  Gravité     Critique", color: "text-[var(--danger)]", delay: 160 },
      { text: "", delay: 120 },
      { text: "◆ Étapes pour reproduire", color: "text-[var(--iris)]", delay: 420 },
      { text: "  1. Réunir 5 héros d'une même famille", color: "text-[var(--muted-foreground)]", delay: 200 },
      { text: "  2. Déclencher le Banco", color: "text-[var(--muted-foreground)]", delay: 160 },
      { text: "  3. Vendre un objet avant la fin de l'animation", color: "text-[var(--muted-foreground)]", delay: 160 },
      { text: "", delay: 120 },
      { text: "✔ Transmis à l'équipe, réponse proposée prête", color: "text-[var(--ok)]", delay: 360 },
    ],
  },
  {
    label: "Idée",
    command: "triage « Un mode défi quotidien avec une graine commune ? »",
    lines: [
      { text: "", delay: 80 },
      { text: "◆ Lecture du retour…", color: "text-[var(--iris)]", delay: 420 },
      { text: "  Catégorie   Idée", color: "text-[var(--foreground)]", delay: 260 },
      { text: "  Gravité     Mineure", color: "text-[var(--foreground)]", delay: 160 },
      { text: "", delay: 120 },
      { text: "◆ Résumé", color: "text-[var(--iris)]", delay: 420 },
      { text: "  Défi quotidien : même graine pour tous,", color: "text-[var(--muted-foreground)]", delay: 200 },
      { text: "  classement des scores à la fin de la journée.", color: "text-[var(--muted-foreground)]", delay: 160 },
      { text: "", delay: 120 },
      { text: "✔ Ajouté aux idées à étudier", color: "text-[var(--ok)]", delay: 360 },
    ],
  },
];

export default function AiTriageDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    // La clé change à l'arrivée à l'écran : la démo redémarre quand le joueur la voit
    <TerminalAnimationRoot ref={ref} key={inView ? "live" : "idle"} tabs={TABS} className="relative">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(185,139,255,0.22),transparent_70%)] blur-2xl" />
      <TerminalAnimationWindow
        minHeight="24rem"
        animateOnVisible={false}
        className="glass rounded-[1.4rem]! shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
        backgroundColor="rgba(16, 8, 20, 0.82)"
      >
        {/* Barre de titre façon fenêtre */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-[#ff7a8a]/80" />
            <span className="size-3 rounded-full bg-[var(--gold)]/80" />
            <span className="size-3 rounded-full bg-[var(--ok)]/80" />
          </div>
          <TerminalAnimationTabList className="ml-auto flex gap-1">
            {TABS.map((tab, index) => (
              <TerminalAnimationTabTrigger
                key={tab.label}
                index={index}
                className="rounded-full px-3 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] data-[state=active]:bg-[rgba(224,184,74,0.14)] data-[state=active]:text-[var(--gold-light)]"
              >
                {tab.label}
              </TerminalAnimationTabTrigger>
            ))}
          </TerminalAnimationTabList>
        </div>

        <TerminalAnimationContent className="font-mono text-[13px] leading-relaxed sm:px-6! sm:py-6!">
          <div className="mb-3 flex items-start gap-3">
            <AiBlobWarpAvatar className="size-6 shrink-0" />
            <TerminalAnimationCommandBar
              className="text-[var(--gold-light)]"
              cursor={<TerminalAnimationBlinkingCursor className="bg-[var(--gold-light)]" />}
            />
          </div>
          <TerminalAnimationOutput
            renderLine={(line, _index, visible) =>
              visible ? (
                <span className={`block whitespace-pre-wrap ${line.color ?? ""}`}>{line.text || " "}</span>
              ) : null
            }
          />
          <TerminalAnimationTrailingPrompt className="mt-2 text-[var(--muted-foreground)]">
            <span className="text-[var(--gold)]">›</span> <TerminalAnimationBlinkingCursor />
          </TerminalAnimationTrailingPrompt>
        </TerminalAnimationContent>
      </TerminalAnimationWindow>
    </TerminalAnimationRoot>
  );
}
