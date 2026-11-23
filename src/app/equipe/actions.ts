"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { clientAdmin, compteParEmail, lienAcces } from "@/lib/supabase/admin";
import { entrepriseDuDirigeant } from "@/lib/supabase/serveur";
import { lireInvitation } from "@/lib/equipe";

export type EtatEquipe = { ok: boolean; message: string; saisie: Record<string, string>; lien?: string; pour?: string } | null;

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
  const lien = await lienAcces(admin, lu.email, (await headers()).get("origin") ?? "");
  refresh();
  return lien
    ? { ok: true, message: `${lu.nom} est ajouté. Envoyez-lui son lien d'accès :`, saisie: { nom: "", email: "" }, lien, pour: lu.nom }
    : { ok: true, message: `${lu.nom} est ajouté, mais le lien d'accès n'a pas pu être fabriqué. Utilisez « Nouveau lien » dans la liste.`, saisie: { nom: "", email: "" } };
}

export type EtatLien = { message: string; lien?: string } | null;

/** Nouveau lien d'accès pour un chauffeur de l'entreprise du dirigeant (première connexion manquée, mot de passe oublié). */
export async function lienChauffeur(_: EtatLien, form: FormData): Promise<EtatLien> {
  const userId = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(userId)) return { message: "Chauffeur introuvable." };
  const { entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return { message: "Seul le dirigeant peut faire cela. Reconnectez-vous si besoin." };

  // Clé secrète : on vérifie d'abord que ce compte est bien un chauffeur de CETTE entreprise.
  const admin = clientAdmin();
  const { data: m } = await admin.from("membres").select("user_id").eq("entreprise_id", entrepriseId).eq("user_id", userId).eq("role", "chauffeur").maybeSingle();
  if (!m) return { message: "Chauffeur introuvable." };
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const lien = u.user?.email ? await lienAcces(admin, u.user.email, (await headers()).get("origin") ?? "") : null;
  return lien ? { message: "", lien } : { message: "Le lien n'a pas pu être fabriqué. Réessayez." };
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
