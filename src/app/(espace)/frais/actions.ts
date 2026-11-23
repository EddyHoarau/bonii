"use server";

import { refresh } from "next/cache";
import { membreConnecte } from "@/lib/supabase/serveur";
import { estStatutNote, lireNote } from "@/lib/equipe";

export type EtatNote = { ok: boolean; message: string; saisie: Record<string, string> } | null;

const FORMAT_ID = /^[0-9a-f-]{36}$/i;
const CHAMPS = ["jour", "nature", "montant", "commentaire"];

export async function ajouterNote(_: EtatNote, form: FormData): Promise<EtatNote> {
  const saisie = Object.fromEntries(CHAMPS.map((c) => [c, String(form.get(c) ?? "")]));
  const echec = (message: string) => ({ ok: false, message, saisie });
  const lu = lireNote((c) => saisie[c]);
  if ("erreur" in lu) return echec(lu.erreur);
  const { supabase, userId, entrepriseId } = await membreConnecte();
  if (!userId || !entrepriseId) return echec("Session expirée. Reconnectez-vous.");
  // RLS : chacun ne dépose que ses propres notes, dans son entreprise, au statut « à valider ».
  const { error } = await supabase.from("notes_frais").insert({ entreprise_id: entrepriseId, user_id: userId, ...lu.fiche });
  if (error) return echec("Enregistrement impossible : " + error.message);
  refresh();
  return { ok: true, message: "Note déposée. Votre dirigeant la verra.", saisie: { ...saisie, montant: "", commentaire: "" } };
}

/** RLS : on ne retire que sa propre note, tant qu'elle n'est pas traitée. */
export async function supprimerNote(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return;
  const { supabase } = await membreConnecte();
  await supabase.from("notes_frais").delete().eq("id", id);
  refresh();
}

/** RLS : seul le dirigeant change le statut, et la base ne laisse modifier que cette colonne. */
export async function statuerNote(form: FormData) {
  const id = String(form.get("id") ?? ""), statut = form.get("statut");
  if (!FORMAT_ID.test(id) || !estStatutNote(statut)) return;
  const { supabase } = await membreConnecte();
  await supabase.from("notes_frais").update({ statut }).eq("id", id);
  refresh();
}
