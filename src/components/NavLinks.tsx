"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

export type NavLink = { href: string; label: string; exact?: boolean };

// Liens de l'en-tête : une pastille glisse sous la page ouverte
export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <ul className="m-0 flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <li key={link.href} className="relative">
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full border border-[var(--border-strong)] bg-[rgba(224,184,74,0.12)] shadow-[0_0_20px_-4px_rgba(224,184,74,0.45)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Link
              href={link.href}
              className={`relative block rounded-full px-3 py-1.5 text-sm no-underline transition-colors ${
                active ? "text-[var(--gold-light)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
