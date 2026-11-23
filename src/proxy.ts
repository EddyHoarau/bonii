import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIQUES = ["/connexion", "/acces"];

// Rafraîchit la session à chaque page (méthode officielle Supabase) et renvoie vers
// /connexion si personne n'est connecté. Chaque page revérifie elle-même : ceci n'est qu'un aiguillage.
export async function proxy(request: NextRequest) {
  let reponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          reponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
          Object.entries(headers).forEach(([k, v]) => reponse.headers.set(k, v));
        },
      },
    },
  );
  // Ne rien mettre entre createServerClient et getClaims (consigne Supabase).
  const { data } = await supabase.auth.getClaims();

  const chemin = request.nextUrl.pathname;
  if (!data?.claims && !PUBLIQUES.some((p) => chemin.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return reponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
