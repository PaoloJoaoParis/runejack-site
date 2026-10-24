import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages publiques, comparées en égalité stricte
const PUBLIC_PAGES = ["/"];
// Préfixes publics. Les routes /api vérifient elles-mêmes la session.
const PUBLIC_PREFIXES = ["/connexion", "/auth", "/api"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Vérifie la signature du jeton et le rafraîchit si nécessaire.
  // getClaims vérifie le jeton sur place (clés de signature publiques, gardées en cache) :
  // pas d'aller-retour vers Supabase à chaque page, contrairement à getUser.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PAGES.includes(path) || PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    return NextResponse.redirect(url);
  }

  return response;
}