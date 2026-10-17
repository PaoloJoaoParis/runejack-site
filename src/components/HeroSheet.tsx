import HeroPortrait from "@/components/HeroPortrait";
import { percent, signedPercent, type MeasuredHero, type PhaseId, type PlayerHeroResult } from "@/lib/meta";

const PHASE_LABELS: Record<PhaseId, string> = { debut: "Début", milieu: "Milieu", fin: "Fin", fond: "Fond" };

const refs = (items: { nom: string }[]) => items.map((item) => item.nom).join(", ") || "—";

// Fiche d'un héros : ses résultats réels, puis ce que mesure la simulation et ce qu'elle conseille
export default function HeroSheet({ hero, players }: { hero: MeasuredHero; players: PlayerHeroResult | null }) {
  return (
    <details id={`heros-${hero.id}`}>
      <summary className="flex items-center gap-3">
        <HeroPortrait id={hero.id} name={hero.nom} size={44} />
        <span>
          <strong>{hero.nom}</strong>
          <span className="block text-sm text-[var(--muted)]">
            {hero.rareteNom} · {hero.familles.join(" / ")} · {hero.role}
            {hero.traitUnique && ` · ${hero.traitUnique}`}
          </span>
        </span>
      </summary>

      <h3>Capacité</h3>
      <ol>
        {hero.capacite.map((text, index) => (
          <li key={index}>
            {index + 1}★ : {text}
          </li>
        ))}
      </ol>

      <h3>Résultats des joueurs</h3>
      {!players || players.runs === 0 ? (
        <p>Aucune run terminée avec ce héros depuis l&apos;équilibrage en cours.</p>
      ) : (
        <>
          <p>
            {percent(players.tauxVictoire)} de victoires sur {players.runs} runs ({players.joueurs} joueur(s)) ·
            présence {percent(players.presence)} · étage moyen {players.etageMoyen ?? "—"}
          </p>
          <p>
            Fin des runs par étage :{" "}
            {Object.entries(players.finParEtage)
              .map(([floor, runs]) => `étage ${floor} : ${runs}`)
              .join(" · ")}
          </p>
          <p>
            Par étoiles :{" "}
            {Object.entries(players.parEtoiles)
              .map(([stars, r]) => `${stars}★ : ${percent(r.tauxVictoire)} sur ${r.runs} runs`)
              .join(" · ")}
          </p>
          {players.objets.length > 0 && (
            <p>
              Objets que les joueurs lui mettent :{" "}
              {players.objets
                .map((item) => `${item.nom} (${percent(item.presence)}, ${percent(item.tauxVictoire)} de victoires)`)
                .join(", ")}
            </p>
          )}
        </>
      )}

      <h3>Mesure par simulation</h3>
      <p>
        Valeur par phase :{" "}
        {(Object.keys(PHASE_LABELS) as PhaseId[])
          .filter((phase) => hero.valeur[phase] !== undefined)
          .map((phase) => `${PHASE_LABELS[phase]} ${signedPercent(hero.valeur[phase])} (${hero.tier[phase] ?? "—"})`)
          .join(" · ")}
      </p>
      <p>
        Seul {signedPercent(hero.seul)} · en famille {signedPercent(hero.avecFamille)}
        {hero.avecFamille - hero.seul >= 50 && " : à jouer dans sa famille"}
        {hero.orParSalle !== undefined && ` · ${hero.orParSalle} or en plus par salle gagnée`}
      </p>
      {hero.grandit && (
        <p>
          Il grandit : pris tôt {signedPercent(hero.grandit.plein)}, à moitié {signedPercent(hero.grandit.aMoitie)},
          pris tard {signedPercent(hero.grandit.compteurVide)}
        </p>
      )}

      <h3>Conseils</h3>
      <ul>
        {hero.objets.milieu && (
          <li>
            Objets au milieu :{" "}
            {hero.objets.milieu.map((item) => `${item.nom} (${signedPercent(item.gain)})`).join(", ")}
          </li>
        )}
        <li>
          Trio en fin de run : {refs(hero.objets.fin.trio)} ({signedPercent(hero.objets.fin.gain)})
        </li>
        <li>
          Trio au Fond : {refs(hero.objets.fond.trio)} ({signedPercent(hero.objets.fond.gain)})
        </li>
        <li>
          Bénédictions : {hero.benedictions.map((b) => `${b.nom} (${signedPercent(b.gain)})`).join(", ")}
        </li>
        <li>
          Au Fond, graver une âme sur lui rapporte {signedPercent(hero.eveil.uneAme)} (deux âmes{" "}
          {signedPercent(hero.eveil.deuxAmes)})
        </li>
      </ul>
    </details>
  );
}
