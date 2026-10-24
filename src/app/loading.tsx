import { AiBlobWarpAvatar } from "@/components/ui/ai-blob-warp";

// Squelette affiché pendant le chargement de n'importe quelle page.
// Toutes les pages lisent la session, donc sont calculées à chaque visite : sans ce fichier,
// Next.js ne peut rien précharger et l'écran reste figé jusqu'à la réponse du serveur.
// Avec lui, le squelette est préchargé et s'affiche dès le clic, puis la page le remplace.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-[rgba(224,184,74,0.08)] ${className}`} />;
}

export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Chargement de la page">
      <div className="mb-10 flex flex-col gap-4">
        <Bar className="h-3 w-32" />
        <Bar className="h-14 w-2/3 max-w-md" />
        <Bar className="h-5 w-full max-w-xl" />
      </div>
      <div className="glass flex items-center gap-4 p-6">
        <AiBlobWarpAvatar className="size-10 shrink-0" />
        <div className="flex flex-1 flex-col gap-3">
          <Bar className="h-4 w-1/3" />
          <Bar className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Bar className="h-32" />
        <Bar className="h-32" />
        <Bar className="h-32" />
      </div>
    </main>
  );
}
