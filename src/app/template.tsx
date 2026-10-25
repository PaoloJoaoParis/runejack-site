import { ViewTransition } from "react";

// Transition d'une page à l'autre avec l'API View Transitions du navigateur.
// Un template (contrairement au layout) est recréé à chaque navigation : l'ancienne page « sort »,
// la nouvelle « entre ». Le navigateur garde l'ancienne page affichée tant que la nouvelle n'est pas prête,
// puis fond l'une dans l'autre : aucun écran de chargement entre les deux.
// Les animations page-enter et page-exit sont définies dans globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
