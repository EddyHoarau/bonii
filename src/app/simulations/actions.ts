"use server";

import { refresh } from "next/cache";
import { entrepriseDuDirigeant } from "@/lib/supabase/serveur";
import { trouverDonneur } from "@/lib/carnet";
import { estStatut, estType, lireSaisie } from "@/lib/simulations";

export type EtatSimulation = { ok: boolean; message: string } | null;

const FORMAT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORMAT_ID = /^[0-9a-f-]{36}$/i;

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

  // Le donneur d'ordre tapé est relié au carnet ; un nom nouveau y entre comme prospect.
  // Si le carnet ne répond pas, la simulation est enregistrée quand même, sans lien.
  let donneurId: string | null = null;
  if (donneur) {
    const { data: carnet } = await supabase.from("donneurs_ordre").select("id, nom").eq("entreprise_id", entrepriseId).returns<{ id: string; nom: string }[]>();
    donneurId = trouverDonneur(carnet ?? [], donneur)?.id ?? null;
    if (!donneurId && carnet) {
      const { data: cree } = await supabase.from("donneurs_ordre").insert({ entreprise_id: entrepriseId, nom: donneur }).select("id").maybeSingle();
      donneurId = (cree?.id as string | undefined) ?? null;
    }
  }

  // RLS : l'ajout ne passe que pour le dirigeant de cette entreprise, en son nom.
  const { error } = await supabase.from("simulations").insert({
    entreprise_id: entrepriseId, type, statut, nom, donneur_ordre: donneur || null, donneur_ordre_id: donneurId, date_simulation: date, saisie,
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
