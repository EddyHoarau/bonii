"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { entrepriseDuDirigeant } from "@/lib/supabase/serveur";
import { CLES_COUTS_VEHICULE, ECHEANCES, lireVehicule } from "@/lib/vehicules";

// « saisie » renvoie ce qui a été tapé : React vide le formulaire après l'envoi et le réaffiche avec.
export type EtatVehicule = { ok: boolean; message: string; saisie: Record<string, string> } | null;

const FORMAT_ID = /^[0-9a-f-]{36}$/i;
const CHAMPS = ["nom", "immatriculation", ...CLES_COUTS_VEHICULE, ...ECHEANCES.map((e) => e[0])];

/** Crée un véhicule, ou le modifie si le formulaire porte un « id ». */
export async function enregistrerVehicule(_: EtatVehicule, form: FormData): Promise<EtatVehicule> {
  const saisie = Object.fromEntries(CHAMPS.map((c) => [c, String(form.get(c) ?? "")]));
  const echec = (message: string) => ({ ok: false, message, saisie });
  // Tout est relu ici : une action serveur peut recevoir n'importe quoi.
  const lu = lireVehicule((c) => saisie[c]);
  if ("erreur" in lu) return echec(lu.erreur);
  const id = String(form.get("id") ?? "");
  if (id && !FORMAT_ID.test(id)) return echec("Véhicule introuvable. Rechargez la page.");

  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return echec("Seul le dirigeant peut modifier les véhicules. Reconnectez-vous si besoin.");

  // RLS : seuls les véhicules de l'entreprise du dirigeant peuvent changer.
  const table = supabase.from("vehicules");
  const { data, error } = id
    ? await table.update(lu.fiche).eq("id", id).select("id")
    : await table.insert({ entreprise_id: entrepriseId, ...lu.fiche }).select("id");
  if (error || !data?.length) return echec("Enregistrement impossible" + (error ? " : " + error.message : "."));
  refresh();
  return id
    ? { ok: true, message: "Véhicule enregistré.", saisie }
    : { ok: true, message: `« ${lu.fiche.nom} » est ajouté.`, saisie: {} };
}

export async function supprimerVehicule(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return;
  const { supabase } = await entrepriseDuDirigeant();
  await supabase.from("vehicules").delete().eq("id", id);
  redirect("/vehicules");
}
