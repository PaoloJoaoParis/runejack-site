"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { RollingNumber } from "@/components/ui/rolling-number";

// Nombre qui roule de 0 jusqu'à sa valeur quand il entre à l'écran
export default function CountUp({ value, precision = 0 }: { value: number; precision?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <span ref={ref} className="tabular-nums">
      <RollingNumber
        value={inView ? value : 0}
        precision={precision}
        format={(n) => n.toLocaleString("fr-FR", { maximumFractionDigits: precision })}
      />
    </span>
  );
}
