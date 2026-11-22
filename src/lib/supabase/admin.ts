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
