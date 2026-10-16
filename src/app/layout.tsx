import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Runejack",
  description: "Roguelike de cartes en bêta privée : meta, retours des joueurs et accès à la bêta.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* L'en-tête lit la session (cookies) : il est calculé à chaque requête */}
        <Suspense fallback={<header className="h-[61px] border-b" />}>
          <Header />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
