import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Jersey_10 } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Iridescence from "@/components/Iridescence";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// La police pixel du jeu, pour les titres
const jersey = Jersey_10({ variable: "--font-jersey", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Runejack",
  description: "Roguelike de cartes en bêta privée : retours des joueurs triés par IA, statistiques et accès à la bêta.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // .dark : les composants Cult UI utilisent leur thème sombre
    <html lang="fr" className={`dark ${geistSans.variable} ${geistMono.variable} ${jersey.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Iridescence />
        {/* L'en-tête lit la session (cookies) : il est calculé à chaque requête */}
        <Suspense fallback={<div className="h-[72px]" />}>
          <Header />
        </Suspense>
        {children}
        <Footer />
      </body>
    </html>
  );
}
