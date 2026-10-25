"use client";

import Link from "next/link";
import { motion } from "motion/react";

export type AdminTab = { id: string; label: string; href: string; badge?: number };

// Onglets de l'administration : une pastille glisse sous l'onglet ouvert, un compteur signale ce qui attend
export default function AdminTabs({ tabs, active }: { tabs: AdminTab[]; active: string }) {
  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[rgba(20,10,26,0.72)] p-1 backdrop-blur-xl sm:w-fit">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm no-underline transition-colors ${
              isActive ? "text-[var(--gold-light)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="admin-tab"
                className="absolute inset-0 rounded-full border border-[var(--border-strong)] bg-[rgba(224,184,74,0.14)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{tab.label}</span>
            {Boolean(tab.badge) && (
              <span className="relative grid min-w-5 place-items-center rounded-full bg-[var(--gold)] px-1.5 text-xs font-semibold text-[#2a1805]">
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
