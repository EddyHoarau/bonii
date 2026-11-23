"use server";

import { refresh } from "next/cache";
import { membreConnecte } from "@/lib/supabase/serveur";
import { lireMessage } from "@/lib/equipe";

export type EtatMessage = { ok: boolean; message: string; saisie: string } | null;

const FORMAT_ID = /^[0-9a-f-]{36}$/i;

/** Le chauffeur écrit dans son propre fil ; le dirigeant dans celui du chauffeur choisi (« fil »). */
export async function envoyerMessage(_: EtatMessage, form: FormData): Promise<EtatMessage> {
  const saisie = String(form.get("texte") ?? "");
  const echec = (message: string) => ({ ok: false, message, saisie });
  const texte = lireMessage(saisie);
  if (!texte) return echec("Écrivez un message (2 000 caractères au plus).");
  const { supabase, userId, entrepriseId, role } = await membreConnecte();
  if (!userId || !entrepriseId) return echec("Session expirée. Reconnectez-vous.");
  const fil = role === "dirigeant" ? String(form.get("fil") ?? "") : userId;
  if (!FORMAT_ID.test(fil)) return echec("Conversation introuvable. Rechargez la page.");
  // RLS : l'auteur est forcément la personne connectée ; la base refuse un fil d'une autre entreprise.
  const { error } = await supabase.from("messages").insert({ entreprise_id: entrepriseId, chauffeur_id: fil, auteur_id: userId, texte });
  if (error) return echec("Envoi impossible : " + error.message);
  refresh();
  return { ok: true, message: "", saisie: "" };
}
