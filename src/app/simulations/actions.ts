"use server";

import { refresh } from "next/cache";
import { clientSupabase } from "@/lib/supabase/serveur";
import { estStatut, estType, lireSaisie } from "@/lib/simulations";

export type EtatSimulation = { ok: boolean; message: string } | null;

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORMAT_ID = /^[0-9a-f-]{36}$/i;

/** Entreprise du dirigeant connecté, ou null. */
async function entrepriseDuDirigeant() {
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { supabase, entrepriseId: null };
  // shortcut: une seule entreprise par dirigeant au lot 1 ; à revoir si un compte en gère plusieurs.
  const { data: m } = await supabase.from("membres").select("entreprise_id").eq("user_id", data.claims.sub).eq("role", "dirigeant").limit(1).maybeSingle();
  return { supabase, entrepriseId: (m?.entreprise_id as string | undefined) ?? null };
}

export async function enregistrerSimulation(_: EtatSimulation, form: FormData): Promise<EtatSimulation> {
  // Tout est relu ici : une action serveur peut recevoir n'importe quoi.
  const type = form.get("type");
  const statut = form.get("statut");
  const nom = String(form.get("nom") ?? "").trim();
  const donneur = String(form.get("donneur") ?? "").trim();
  // Date du jour à Paris : le serveur, lui, est à l'heure UTC.
  const date = String(form.get("date") ?? "").trim() || new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(new Date());
  let saisie = null;
  try { saisie = lireSaisie(JSON.parse(String(form.get("saisie") ?? ""))); } catch { /* traité juste dessous */ }

  if (!estType(type) || !estStatut(statut) || !saisie) return { ok: false, message: "Calcul illisible. Rechargez la page et recommencez." };
  if (nom.length < 1 || nom.length > 200) return { ok: false, message: "Donnez un nom à la simulation (200 caractères au plus)." };
  if (donneur.length > 200) return { ok: false, message: "Le donneur d'ordre dépasse 200 caractères." };
  if (!FORMAT_DATE.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, message: "La date n'est pas valide." };

  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return { ok: false, message: "Seul le dirigeant peut enregistrer une simulation. Reconnectez-vous si besoin." };

  // RLS : l'ajout ne passe que pour le dirigeant de cette entreprise, en son nom.
  const { error } = await supabase.from("simulations").insert({
    entreprise_id: entrepriseId, type, statut, nom, donneur_ordre: donneur || null, date_simulation: date, saisie,
  });
  if (error) return { ok: false, message: "Enregistrement impossible : " + error.message };
  return { ok: true, message: `« ${nom} » est enregistrée.` };
}

export async function changerStatut(form: FormData) {
  const id = String(form.get("id") ?? "");
  const statut = form.get("statut");
  if (!FORMAT_ID.test(id) || !estStatut(statut)) return;
  const { supabase } = await entrepriseDuDirigeant();
  // RLS : seule une simulation de l'entreprise du dirigeant peut changer.
  await supabase.from("simulations").update({ statut }).eq("id", id);
  refresh();
}
