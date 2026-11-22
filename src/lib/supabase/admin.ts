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

/** Crée le compte de cette adresse, ou retrouve celui qui existe. Sans e-mail d'invitation : la personne se connecte par lien sur /connexion. */
export async function compteParEmail(admin: Admin, email: string): Promise<{ userId: string } | { erreur: string }> {
  const cree = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (cree.data.user) return { userId: cree.data.user.id };
  if (cree.error?.code === "email_exists") {
    // shortcut: recherche dans les 1 000 premiers comptes, à remplacer par une fonction SQL au-delà.
    const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const trouve = liste?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (trouve) return { userId: trouve };
  }
  return { erreur: cree.error?.message ?? "compte introuvable" };
}
