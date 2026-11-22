import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** Client Supabase côté serveur, au nom de l'utilisateur connecté (les règles RLS s'appliquent). */
export async function clientSupabase() {
  // Le client lit l'heure (Date.now) : Next 16 l'interdit pendant le pré-rendu, on attend donc la vraie requête.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appel depuis un composant serveur : sans effet, le proxy rafraîchit la session.
          }
        },
      },
    },
  );
}

/** Client Supabase et entreprise du dirigeant connecté (null s'il n'est pas dirigeant ou pas connecté). */
export async function entrepriseDuDirigeant() {
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { supabase, entrepriseId: null };
  // shortcut: une seule entreprise par dirigeant au lot 1 ; à revoir si un compte en gère plusieurs.
  const { data: m } = await supabase.from("membres").select("entreprise_id").eq("user_id", data.claims.sub).eq("role", "dirigeant").limit(1).maybeSingle();
  return { supabase, entrepriseId: (m?.entreprise_id as string | undefined) ?? null };
}

/** Adresses autorisées à créer des entreprises (variable serveur ADMIN_EMAILS, séparées par des virgules). */
export function estAdmin(email: string | undefined | null) {
  const liste = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && liste.includes(email.toLowerCase());
}
