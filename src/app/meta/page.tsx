import HeroPortrait from "@/components/HeroPortrait";
import HeroSheet from "@/components/HeroSheet";
import {
  MIN_PLAYER_RUNS,
  PACT_NAMES,
  percent,
  rankHeroes,
  signedPercent,
  TIERS,
  type Compo,
  type MeasuredMeta,
  type PlayersMeta,
} from "@/lib/meta";
import { loadMeasuredMeta, loadPlayersMeta } from "@/lib/runejack";

// Les deux méta sont gardées une heure en cache : le jeu reçoit au plus un appel par heure et par route.
// Chacune peut manquer sans empêcher l'autre de s'afficher.
async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error("Méta indisponible :", error);
    return null;
  }
}

function CompoLine({ compo }: { compo: Compo }) {
  return (
    <li>
      {compo.famille && <strong>{compo.famille} : </strong>}
      {compo.heros
        .map(
          (h) => `${h.nom} ${h.etoiles}★${h.objets.length ? ` (${h.objets.map((item) => item.nom).join(", ")})` : ""}`
        )
        .join(" · ")}
      {compo.runes.length > 0 && ` · runes : ${compo.runes.map((r) => r.nom).join(", ")}`} ·{" "}
      {compo.degatsParSalle.toLocaleString("fr-FR")} dégâts par salle · Banco {percent(compo.banco)}
    </li>
  );
}

function PlayersTierList({ measured, players }: { measured: MeasuredMeta; players: PlayersMeta }) {
  const ranked = rankHeroes(measured, players);

  return (
    <section>
      <h2>Tier list</h2>
      <p>
        Classement au taux de victoire réel des joueurs : {players.runs} runs de {players.joueurs} joueur(s) depuis la
        version {players.depuis.version}, {percent(players.tauxVictoire)} de victoires en moyenne. Tant qu&apos;un héros
        a peu de runs, sa note est complétée par la simulation : un héros joué trois fois ne passe pas S sur un coup de
        chance.
      </p>
      <div className="flex flex-col gap-3">
        {TIERS.map((tier) => {
          const heroes = ranked.filter((r) => r.tier === tier);
          if (heroes.length === 0) return null;
          return (
            <div
              key={tier}
              className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 backdrop-blur-xl"
            >
              <span className={`tier tier-${tier} h-16! min-w-16! text-4xl!`}>{tier}</span>
              <ul className="plain m-0 flex flex-1 flex-wrap gap-2">
                {heroes.map((r) => (
                  <li key={r.hero.id} className="m-0">
                    <a
                      href={`#heros-${r.hero.id}`}
                      title={
                        r.players && r.players.runs > 0
                          ? `${percent(r.players.tauxVictoire)} sur ${r.players.runs} runs · présence ${percent(r.players.presence)} · étage moyen ${r.players.etageMoyen ?? "—"}`
                          : `Aucune run · simulation : ${r.simulatedTier}`
                      }
                      className="group flex items-center gap-2 rounded-xl border border-transparent bg-[rgba(12,6,16,0.55)] py-1 pr-3 pl-1 text-sm text-[var(--foreground)] no-underline transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
                    >
                      <HeroPortrait id={r.hero.id} name={r.hero.nom} size={36} />
                      <span>
                        {r.hero.nom}
                        <span className="block text-xs text-[var(--muted)]">
                          note {r.score.toLocaleString("fr-FR")}
                          {r.lowSample && " · peu de parties"}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm">
        « Peu de parties » : moins de {MIN_PLAYER_RUNS} runs, la note s&apos;appuie surtout sur la simulation. Survole un
        héros pour ses chiffres. Calculé le {new Date(players.calculeLe).toLocaleString("fr-FR")}.
      </p>
    </section>
  );
}

export default async function MetaPage() {
  const [measured, players] = await Promise.all([settle(loadMeasuredMeta()), settle(loadPlayersMeta())]);

  if (!measured) {
    return (
      <main>
        <h1>Méta de Runejack</h1>
        <p role="alert">Les statistiques du jeu sont momentanément indisponibles. Reviens dans quelques minutes.</p>
      </main>
    );
  }

  const heroesById = new Map(measured.heros.map((h) => [h.id, h]));
  const playerHeroes = new Map((players?.heros ?? []).map((h) => [h.id, h]));

  return (
    <main>
      <h1>Méta de Runejack</h1>
      <p>
        Jeu en version {measured.jeu} · simulation de la version {measured.mesure.version} du{" "}
        {new Date(measured.mesure.date).toLocaleDateString("fr-FR")}.
      </p>
      <p>
        <a href="#heros">Héros</a> · <a href="#theorique">Tier list mesurée</a> · <a href="#familles">Familles</a> ·{" "}
        <a href="#compos">Compos</a> · <a href="#objets">Objets</a> · <a href="#runes">Runes</a> ·{" "}
        <a href="#benedictions">Bénédictions</a> · <a href="#notes">Mises à jour</a>
      </p>

      {players ? (
        <PlayersTierList measured={measured} players={players} />
      ) : (
        <p role="alert">Les résultats des joueurs sont momentanément indisponibles : seule la simulation est affichée.</p>
      )}

      <section id="theorique">
        <h2>Tier list mesurée par simulation</h2>
        <p>{measured.methode}</p>
        {measured.phases.map((phase) => (
          <div key={phase.id}>
            <h3>
              {phase.nom} · {phase.sieges} sièges · {phase.etoiles}★
            </h3>
            <ul className="plain">
              {TIERS.filter((tier) => phase.tiers[tier].length > 0).map((tier) => (
                <li key={tier} className="flex items-center gap-3">
                  <span className={`tier tier-${tier}`}>{tier}</span>
                  <span className="flex flex-wrap gap-1.5">
                    {phase.tiers[tier].map((id) => (
                      <a key={id} href={`#heros-${id}`} title={heroesById.get(id)?.nom ?? id}>
                        <HeroPortrait id={id} name={heroesById.get(id)?.nom ?? id} size={34} />
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="heros">
        <h2>Héros</h2>
        {measured.heros.map((hero) => (
          <HeroSheet key={hero.id} hero={hero} players={playerHeroes.get(hero.id) ?? null} />
        ))}
      </section>

      <section id="familles">
        <h2>Familles</h2>
        {measured.familles.map((family) => {
          const result = players?.familles.find((f) => f.id === family.id);
          return (
            <div key={family.id}>
              <h3>{family.nom}</h3>
              <ol>
                {family.paliers.map((text, index) => (
                  <li key={index} value={index + 2}>
                    {index + 2} héros : {text}
                  </li>
                ))}
              </ol>
              <p>
                Banco sans objet ni rune : {family.bancoNu.fin.toLocaleString("fr-FR")} dégâts par salle en fin de run,{" "}
                {family.bancoNu.fond.toLocaleString("fr-FR")} au Fond.
              </p>
              <p>
                Gain du plateau par nombre de héros :{" "}
                {Object.entries(family.gainParNombre)
                  .map(([count, gain]) => `${count} : ${signedPercent(gain)}`)
                  .join(" · ")}
              </p>
              {result && result.runs > 0 && (
                <p>
                  Chez les joueurs : {percent(result.tauxVictoire)} de victoires sur {result.runs} runs, {result.banco}{" "}
                  Banco.
                </p>
              )}
            </div>
          );
        })}
      </section>

      <section id="compos">
        <h2>Compos</h2>
        {measured.compos.map((group) => (
          <div key={group.phase}>
            <h3>{measured.phases.find((p) => p.id === group.phase)?.nom ?? group.phase}</h3>
            <p>Les plus fortes :</p>
            <ul>
              {group.meilleures.map((compo, index) => (
                <CompoLine key={index} compo={compo} />
              ))}
            </ul>
            <p>La meilleure de chaque famille :</p>
            <ul>
              {group.parFamille.map((compo, index) => (
                <CompoLine key={index} compo={compo} />
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="objets">
        <h2>Objets</h2>
        <table>
          <thead>
            <tr>
              <th>Objet</th>
              <th>Genre</th>
              <th>Effet</th>
              <th>Gain mesuré</th>
              <th>Tier</th>
              <th>Chez les joueurs</th>
            </tr>
          </thead>
          <tbody>
            {measured.objets
              .toSorted((a, b) => b.gainMoyen - a.gainMoyen)
              .map((item) => {
                const result = players?.objets.find((o) => o.id === item.id);
                return (
                  <tr key={item.id}>
                    <td>{item.nom}</td>
                    <td>{item.genre}</td>
                    <td>
                      {item.stats}
                      {item.effet && ` · ${item.effet}`}
                    </td>
                    <td>{signedPercent(item.gainMoyen)}</td>
                    <td>{item.tier ?? "—"}</td>
                    <td>{result && result.runs > 0 ? `${percent(result.tauxVictoire)} sur ${result.runs} runs` : "—"}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section id="runes">
        <h2>Runes</h2>
        <table>
          <thead>
            <tr>
              <th>Rune</th>
              <th>Rareté</th>
              <th>Effet</th>
              <th>Gain mesuré</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {measured.runes
              .toSorted((a, b) => (b.gain ?? -Infinity) - (a.gain ?? -Infinity))
              .map((rune) => (
                <tr key={rune.id}>
                  <td>{rune.nom}</td>
                  <td>{rune.rarete}</td>
                  <td>{rune.effet}</td>
                  <td>
                    {signedPercent(rune.gain)}
                    {rune.orParSalle !== undefined && ` · ${rune.orParSalle} or par salle`}
                  </td>
                  <td>{rune.tier ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      <section id="benedictions">
        <h2>Bénédictions</h2>
        <table>
          <thead>
            <tr>
              <th>Bénédiction</th>
              <th>Effet</th>
              <th>Milieu</th>
              <th>Fin</th>
              <th>Fond</th>
            </tr>
          </thead>
          <tbody>
            {measured.benedictions
              .toSorted((a, b) => (b.gain.fin ?? -Infinity) - (a.gain.fin ?? -Infinity))
              .map((blessing) => (
                <tr key={blessing.id}>
                  <td>{blessing.nom}</td>
                  <td>{blessing.effet}</td>
                  <td>{signedPercent(blessing.gain.milieu)}</td>
                  <td>{signedPercent(blessing.gain.fin)}</td>
                  <td>{signedPercent(blessing.gain.fond)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {players && players.pactes.length > 0 && (
        <section>
          <h2>Pactes chez les joueurs</h2>
          <ul>
            {players.pactes.map((pact) => (
              <li key={pact.niveau}>
                {PACT_NAMES[pact.niveau]} : {percent(pact.tauxVictoire)} de victoires sur {pact.runs} runs, étage moyen{" "}
                {pact.etageMoyen ?? "—"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="notes">
        <h2>Mises à jour</h2>
        {measured.notes.map((note) => (
          <details key={note.version}>
            <summary>
              {note.version} · {note.date} · {note.titre}
            </summary>
            {note.intro && <p>{note.intro}</p>}
            {note.sections.map((section) => (
              <div key={section.titre}>
                <h3>{section.titre}</h3>
                <ul>
                  {section.lignes.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        ))}
      </section>
    </main>
  );
}
