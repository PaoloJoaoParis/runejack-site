import "server-only";
import { Resend } from "resend";

// Remplace les caractères spéciaux HTML : une donnée saisie par l'utilisateur
// ne doit jamais pouvoir injecter de balises dans l'e-mail
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendEmail(message: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("La variable RESEND_API_KEY n'est pas définie.");
  }

  const { error } = await new Resend(apiKey).emails.send({
    from: process.env.EMAIL_FROM || "Runejack <onboarding@resend.dev>",
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  if (error) {
    throw new Error(`Envoi refusé par Resend : ${error.message}`);
  }
}

export async function sendBetaWelcome({ to, username }: { to: string; username: string }) {
  const gameUrl = process.env.GAME_URL ?? "";
  const safeUsername = escapeHtml(username);
  const safeEmail = escapeHtml(to);

  await sendEmail({
    to,
    subject: "Bienvenue dans la bêta de Runejack",
    html: `<p>Salut ${safeUsername},</p>
      <p>Ta demande est acceptée : tu fais partie de la bêta privée de Runejack.</p>
      <p><a href="${gameUrl}">Ouvre le jeu</a> et crée ton compte <strong>avec cette adresse e-mail</strong> (${safeEmail}).
      Le pseudo ${safeUsername} n'est pas réservé : choisis-le vite.</p>
      <p>Bon jeu,<br>L'équipe Lappal</p>`,
    text: `Ta demande est acceptée : tu fais partie de la bêta privée de Runejack. Ouvre le jeu (${gameUrl}) et crée ton compte avec cette adresse e-mail (${to}).`,
  });
}
