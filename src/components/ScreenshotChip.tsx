"use client";

import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;

// Capture jointe au retour, affichée dans le champ de saisie comme une pièce jointe de ChatGPT
export default function ScreenshotChip({ file, valid, onRemove }: { file: File; valid: boolean; onRemove: () => void }) {
  // Aperçu local de l'image, libéré quand la capture change ou disparaît
  const preview = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);

  return (
    <motion.div
      className={`flex w-fit max-w-full items-center gap-2 rounded-xl border bg-[rgba(12,6,16,0.6)] py-1 pr-1 pl-1 ${
        valid ? "border-[var(--border-strong)]" : "border-[var(--danger)]"
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), pas d'optimisation possible
        <img src={preview} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
      )}
      <span className="min-w-0 text-xs leading-tight">
        <span className="block truncate text-[var(--foreground)]">{file.name}</span>
        <span className={valid ? "text-[var(--muted-foreground)]" : "text-[var(--danger)]"}>
          {valid ? formatSize(file.size) : "PNG, JPEG ou WebP de 2 Mo max"}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--muted-foreground)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--foreground)]"
        aria-label="Retirer la capture"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </motion.div>
  );
}
