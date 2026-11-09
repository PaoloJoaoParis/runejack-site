import type { NextConfig } from "next";

// Le jeu : l'accueil et la bêta du site y renvoient. utm_source=site garde la provenance dans le tableau de bord
// du jeu (le jeu retire ensuite ce paramètre de l'adresse, et son adresse canonique reste https://play.runejack.com/).
const GAME = "https://play.runejack.com/?utm_source=site";

const nextConfig: NextConfig = {
  // Le site vitrine est mis de côté : runejack.com/ et /beta renvoient vers le jeu (308, permanent, pour que les
  // moteurs reportent le référencement sur play.runejack.com). Ces redirections passent avant le proxy de session.
  // Le reste (connexion, retours, admin, API) répond toujours à son adresse.
  async redirects() {
    return [
      { source: "/", destination: GAME, permanent: true },
      { source: "/beta", destination: GAME, permanent: true },
      { source: "/sitemap.xml", destination: "https://play.runejack.com/sitemap.xml", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
