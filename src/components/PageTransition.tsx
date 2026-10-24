"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

// Transition douce entre les pages : au clic sur un lien interne, un voile prune translucide et flouté
// glisse sur l'écran avec un bord en dégradé (pas de coupure nette), masque le chargement de la page
// suivante, puis continue sa course et la découvre dès qu'elle est affichée.

const EASE = [0.45, 0, 0.2, 1] as const;
// Largeur du dégradé sur les bords du voile, en % de l'écran
const FEATHER = 35;

// Liens qui ne changent pas de page dans le site : /jouer redirige vers le jeu, /auth vers Supabase
const SKIPPED_PATHS = ["/jouer", "/auth", "/api"];

// Si la page ne change pas (navigation annulée), le voile se retire quand même
const SAFETY_MS = 5000;

export default function PageTransition() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);

  // Bord avant (il couvre) et bord arrière (il découvre) du voile, de -FEATHER à 100 + FEATHER
  const front = useMotionValue(-FEATHER);
  const back = useMotionValue(-FEATHER);
  const maskImage = useTransform(
    [front, back],
    ([f, b]) =>
      `linear-gradient(100deg, transparent ${(b as number) - FEATHER}%, black ${b}%, black ${f}%, transparent ${(f as number) + FEATHER}%)`
  );

  const covering = useRef<Promise<unknown> | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Page affichée au moment du clic, et page affichée maintenant
  const fromPath = useRef<string | null>(null);
  const currentPath = useRef(pathname);

  const reveal = useCallback(async () => {
    // Pris puis vidé tout de suite : un seul retrait même si la page change et le délai expire ensemble
    const pending = covering.current;
    if (!pending) return;
    covering.current = null;
    fromPath.current = null;
    if (safety.current) clearTimeout(safety.current);
    await pending;
    await animate(back, 100 + FEATHER, { duration: 0.6, ease: EASE });
    setActive(false);
  }, [back]);

  const cover = useCallback(() => {
    if (covering.current) return;
    front.set(-FEATHER);
    back.set(-FEATHER);
    setActive(true);
    fromPath.current = window.location.pathname;
    const animation = animate(front, 100 + FEATHER, { duration: 0.55, ease: EASE }).then(() => {});
    covering.current = animation;
    safety.current = setTimeout(reveal, SAFETY_MS);
    // La page a pu changer pendant que le voile passait : on le retire aussitôt
    void animation.then(() => {
      if (currentPath.current !== fromPath.current) void reveal();
    });
  }, [front, back, reveal]);

  // Repère les clics sur les liens internes vers une autre page (Link de Next.js ou simple <a>)
  useEffect(() => {
    if (reduceMotion) return;

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // même page ou simple ancre
      if (SKIPPED_PATHS.some((path) => url.pathname.startsWith(path))) return;

      cover();
    }

    // Phase de capture : le clic est vu avant que Next.js lance la navigation
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [cover, reduceMotion]);

  // La nouvelle page est affichée (ou une redirection, vers /connexion par exemple) : on retire le voile
  useEffect(() => {
    currentPath.current = pathname;
    if (fromPath.current !== null && pathname !== fromPath.current) void reveal();
  }, [pathname, reveal]);

  if (reduceMotion || !active) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(42,20,51,0.88),rgba(12,6,16,0.94)_70%)] backdrop-blur-md"
      style={{ maskImage, WebkitMaskImage: maskImage }}
    >
      {/* Le logo n'apparaît que si le chargement dure : rien ne clignote sur une navigation rapide */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 0.9, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- logo vectoriel */}
        <img src="/logo.svg" alt="" width={40} height={40} />
        <span className="shimmer font-[family-name:var(--font-jersey)] text-5xl leading-none">Runejack</span>
      </motion.div>
    </motion.div>
  );
}
