"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { entrepriseDuDirigeant } from "@/lib/supabase/serveur";
import { lireDonneur } from "@/lib/carnet";
import { aujourdhuiParis, estDate } from "@/lib/echeances";

// « saisie » renvoie ce qui a été tapé : React vide le formulaire après l'envoi et le réaffiche avec.
export type EtatCarnet = { ok: boolean; message: string; saisie: Record<string, string> } | null;

const FORMAT_ID = /^[0-9a-f-]{36}$/i;
const CHAMPS = ["nom", "statut", "interlocuteur", "telephone", "email", "notes"];
const REFUS = "Seul le dirigeant peut modifier le carnet. Reconnectez-vous si besoin.";

/** Crée une fiche, ou la modifie si le formulaire porte un « id ». */
export async function enregistrerDonneur(_: EtatCarnet, form: FormData): Promise<EtatCarnet> {
  const saisie = Object.fromEntries(CHAMPS.map((c) => [c, String(form.get(c) ?? "")]));
  const echec = (message: string) => ({ ok: false, message, saisie });
  // Tout est relu ici : une action serveur peut recevoir n'importe quoi.
  const lu = lireDonneur((c) => saisie[c]);
  if ("erreur" in lu) return echec(lu.erreur);
  const id = String(form.get("id") ?? "");
  if (id && !FORMAT_ID.test(id)) return echec("Fiche introuvable. Rechargez la page.");

  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return echec(REFUS);

  // RLS : seul le carnet de l'entreprise du dirigeant peut changer.
  const table = supabase.from("donneurs_ordre");
  const { data, error } = id
    ? await table.update(lu.fiche).eq("id", id).select("id")
    : await table.insert({ entreprise_id: entrepriseId, ...lu.fiche }).select("id");
  if (error?.code === "23505") return echec("Ce nom est déjà dans votre carnet.");
  if (error || !data?.length) return echec("Enregistrement impossible" + (error ? " : " + error.message : "."));
  refresh();
  return id
    ? { ok: true, message: "Fiche enregistrée.", saisie }
    : { ok: true, message: `« ${lu.fiche.nom} » est dans votre carnet.`, saisie: {} };
}

/** Supprime la fiche et ses relances. Les simulations restent, avec le nom tapé à l'époque. */
export async function supprimerDonneur(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return;
  const { supabase } = await entrepriseDuDirigeant();
  await supabase.from("donneurs_ordre").delete().eq("id", id);
  redirect("/carnet");
}

export async function ajouterRelance(_: EtatCarnet, form: FormData): Promise<EtatCarnet> {
  const saisie = { date: String(form.get("date") ?? "").trim(), objet: String(form.get("objet") ?? "").trim() };
  const echec = (message: string) => ({ ok: false, message, saisie });
  const donneurId = String(form.get("donneur") ?? "");
  if (!FORMAT_ID.test(donneurId)) return echec("Fiche introuvable. Rechargez la page.");
  if (!estDate(saisie.date)) return echec("Choisissez la date de la relance.");
  if (saisie.objet.length < 1 || saisie.objet.length > 300) return echec("Indiquez l'objet de la relance (300 caractères au plus).");

  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return echec(REFUS);
  // La base refuse une relance vers le donneur d'ordre d'une autre entreprise (lien sur les deux colonnes).
  const { error } = await supabase.from("relances").insert({ entreprise_id: entrepriseId, donneur_ordre_id: donneurId, prevue_le: saisie.date, objet: saisie.objet });
  if (error) return echec("Enregistrement impossible : " + error.message);
  refresh();
  return { ok: true, message: "Relance notée.", saisie: { date: "", objet: "" } };
}

export async function marquerRelanceFaite(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return;
  const { supabase } = await entrepriseDuDirigeant();
  await supabase.from("relances").update({ faite_le: aujourdhuiParis() }).eq("id", id).is("faite_le", null);
  refresh();
}
