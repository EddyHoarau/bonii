"use server";

import { clientSupabase } from "@/lib/supabase/serveur";
import { CLES_PROFIL } from "@/lib/profil";

// « saisie » renvoie ce qui a été tapé : React vide le formulaire après l'envoi et le réaffiche avec.
export type EtatProfil = { ok: boolean; message: string; saisie: Record<string, string> } | null;

export async function enregistrerProfil(_: EtatProfil, form: FormData): Promise<EtatProfil> {
  const saisie = Object.fromEntries(CLES_PROFIL.map((cle) => [cle, String(form.get(cle) ?? "").trim()]));
  const echec = (message: string) => ({ ok: false, message, saisie });
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return echec("Session expirée. Reconnectez-vous.");

  // Chaque valeur est relue ici : une action serveur peut recevoir n'importe quoi.
  const valeurs: Record<string, number> = {};
  for (const cle of CLES_PROFIL) {
    const brut = saisie[cle].replace(",", ".");
    const n = Number(brut);
    if (brut === "" || !Number.isFinite(n) || n < 0 || n > 1_000_000) return echec("Une valeur est vide ou incorrecte. Saisissez des nombres positifs.");
    valeurs[cle] = n;
  }
  if (valeurs.jours > 31) return echec("Les jours travaillés ne peuvent pas dépasser 31 par mois.");

  // shortcut: une seule entreprise par dirigeant au lot 1 ; à revoir si un compte en gère plusieurs.
  const { data: membre } = await supabase.from("membres").select("entreprise_id").eq("user_id", data.claims.sub).eq("role", "dirigeant").limit(1).maybeSingle();
  if (!membre) return echec("Seul le dirigeant peut modifier les coûts.");

  // RLS : la mise à jour ne passe que pour le dirigeant de cette entreprise.
  const { data: maj, error } = await supabase.from("profils_couts").update(valeurs).eq("entreprise_id", membre.entreprise_id).select("entreprise_id");
  if (error || !maj?.length) return echec("Enregistrement impossible" + (error ? " : " + error.message : "."));
  return { ok: true, message: "Coûts enregistrés. Les prochains calculs partent de ces valeurs.", saisie };
}
