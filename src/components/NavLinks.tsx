"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

export type NavLink = { href: string; label: string };

// Liens de l'en-tête : une pastille glisse sous la page ouverte
export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <ul className="plain m-0 flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <li key={link.href} className="relative m-0">
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full border border-[var(--border-strong)] bg-[rgba(224,184,74,0.12)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Link
              href={link.href}
              className={`relative block rounded-full px-3 py-1.5 text-sm no-underline transition-colors ${
                active ? "text-[var(--gold-light)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
