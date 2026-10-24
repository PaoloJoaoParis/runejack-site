"use client";

// Dernier filet de sécurité : une erreur dans la mise en page elle-même (en-tête, fond…).
// Cette page remplace tout le document, sans les styles du site : ses styles sont donc écrits ici.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0c0610",
          color: "#f3e9f5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <title>Runejack — erreur</title>
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ color: "#ffe48a", fontSize: "2rem", marginBottom: "0.75rem" }}>Le site a trébuché</h1>
          <p style={{ color: "#b3a0bb", lineHeight: 1.6 }}>
            Une erreur inattendue empêche l&apos;affichage. Réessaie dans un instant.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.4rem",
              border: "none",
              borderRadius: "0.9rem",
              fontWeight: 600,
              color: "#2a1805",
              background: "linear-gradient(180deg, #ffe48a, #e0b84a)",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
