import type { MetadataRoute } from "next";

// robots.txt : l'accueil et /beta restent explorables (les moteurs y lisent la redirection vers le jeu,
// next.config.ts) ; l'espace joueur, l'admin et les routes techniques non. Le plan du site est celui du jeu.
// Le proxy de session ne passe pas sur ce fichier (matcher de src/proxy.ts).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/auth/", "/connexion", "/jouer", "/mes-stats", "/retours"],
    },
    sitemap: "https://play.runejack.com/sitemap.xml",
  };
}
