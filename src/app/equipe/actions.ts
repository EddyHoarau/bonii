"use server";

import { refresh } from "next/cache";
import { clientAdmin, compteParEmail } from "@/lib/supabase/admin";
import { entrepriseDuDirigeant } from "@/lib/supabase/serveur";
import { lireInvitation } from "@/lib/equipe";

export type EtatEquipe = { ok: boolean; message: string; saisie: Record<string, string> } | null;

const FORMAT_ID = /^[0-9a-f-]{36}$/i;

/** Le dirigeant ajoute un chauffeur à SON entreprise. Les rattachements s'écrivent avec la clé secrète, donc tout est revérifié ici. */
export async function inviterChauffeur(_: EtatEquipe, form: FormData): Promise<EtatEquipe> {
  const saisie = { nom: String(form.get("nom") ?? ""), email: String(form.get("email") ?? "") };
  const echec = (message: string) => ({ ok: false, message, saisie });
  const lu = lireInvitation((c) => saisie[c as "nom" | "email"]);
  if ("erreur" in lu) return echec(lu.erreur);

  // L'entreprise vient de la session du dirigeant, jamais du formulaire.
  const { entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return echec("Seul le dirigeant peut ajouter un chauffeur. Reconnectez-vous si besoin.");

  const admin = clientAdmin();
  const compte = await compteParEmail(admin, lu.email);
  if ("erreur" in compte) return echec("Le compte n'a pas pu être créé : " + compte.erreur + ".");
  // Un compte = une entreprise : on ne rattache pas quelqu'un qui en a déjà une (la sienne ou une autre).
  const { data: deja } = await admin.from("membres").select("entreprise_id").eq("user_id", compte.userId).limit(1);
  if (deja?.length) return echec("Cette adresse a déjà un accès à Bonii. Utilisez une autre adresse pour ce chauffeur.");

  const { error } = await admin.from("membres").insert({ entreprise_id: entrepriseId, user_id: compte.userId, role: "chauffeur", nom: lu.nom });
  if (error) return echec("Ajout impossible : " + error.message);
  refresh();
  return { ok: true, message: `${lu.nom} est ajouté. Il se connecte sur la page de connexion avec ${lu.email} : il recevra son lien.`, saisie: { nom: "", email: "" } };
}

/** Retire un chauffeur de l'entreprise du dirigeant : ses tournées redeviennent libres, ses notes de frais et ses messages sont effacés. */
export async function retirerChauffeur(form: FormData) {
  const userId = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(userId)) return;
  const { entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return;
  // Clé secrète : le filtre sur l'entreprise du dirigeant et sur le rôle est la seule barrière, il est donc indispensable.
  await clientAdmin().from("membres").delete().eq("entreprise_id", entrepriseId).eq("user_id", userId).eq("role", "chauffeur");
  refresh();
}
