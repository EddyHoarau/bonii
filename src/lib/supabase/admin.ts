import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client avec la clé SECRÈTE : il passe outre les règles RLS.
 * Uniquement côté serveur, uniquement pour créer une entreprise et inviter son dirigeant.
 */
export function clientAdmin() {
  const cle = process.env.SUPABASE_SECRET_KEY;
  if (!cle) throw new Error("SUPABASE_SECRET_KEY manque dans .env.local");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, cle, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Admin = ReturnType<typeof clientAdmin>;

/** Compte existant de cette adresse, ou null. */
export async function compteExistant(admin: Admin, email: string): Promise<string | null> {
  // shortcut: recherche dans les 1 000 premiers comptes, à remplacer par une fonction SQL au-delà.
  const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return liste?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

/** Crée le compte de cette adresse, ou retrouve celui qui existe. Aucun e-mail ne part : on remet un lien d'accès à la personne. */
export async function compteParEmail(admin: Admin, email: string): Promise<{ userId: string } | { erreur: string }> {
  const cree = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (cree.data.user) return { userId: cree.data.user.id };
  if (cree.error?.code === "email_exists") {
    const trouve = await compteExistant(admin, email);
    if (trouve) return { userId: trouve };
  }
  return { erreur: cree.error?.message ?? "compte introuvable" };
}

/**
 * Lien d'accès à usage unique (durée réglée dans Supabase : 24 h), à transmettre à la main.
 * Il mène à /acces, qui demande un clic avant d'utiliser le jeton : les aperçus de lien
 * (WhatsApp, SMS, messagerie) ne peuvent donc pas le consommer à la place de la personne.
 */
export async function lienAcces(admin: Admin, email: string, origine: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const jeton = data?.properties?.hashed_token;
  return error || !jeton ? null : `${origine}/acces?jeton=${jeton}`;
}
