"use server";

import { redirect } from "next/navigation";
import { clientSupabase } from "@/lib/supabase/serveur";
import { FORMAT_JETON, erreurMotDePasse } from "@/lib/acces";

export type EtatAcces = { message: string } | null;

/** Utilise le jeton du lien d'accès (une seule fois) puis envoie choisir le mot de passe. */
export async function ouvrirAcces(_: EtatAcces, form: FormData): Promise<EtatAcces> {
  const jeton = String(form.get("jeton") ?? "");
  if (!FORMAT_JETON.test(jeton)) return { message: "Ce lien est incomplet. Copiez-le en entier, ou demandez-en un nouveau." };
  const { error } = await (await clientSupabase()).auth.verifyOtp({ type: "magiclink", token_hash: jeton });
  if (error) return { message: "Ce lien n'est plus valable : déjà utilisé ou expiré (24 h). Demandez-en un nouveau à la personne qui vous l'a envoyé." };
  redirect("/mot-de-passe");
}

export type EtatMotDePasse = { message: string } | null;

export async function choisirMotDePasse(_: EtatMotDePasse, form: FormData): Promise<EtatMotDePasse> {
  const mdp = String(form.get("mdp") ?? ""), confirmation = String(form.get("confirmation") ?? "");
  const erreur = erreurMotDePasse(mdp, confirmation);
  if (erreur) return { message: erreur };
  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { message: "Session expirée. Rouvrez votre lien d'accès ou demandez-en un nouveau." };
  const { error } = await supabase.auth.updateUser({ password: mdp });
  if (error?.code === "same_password") return { message: "C'est déjà votre mot de passe actuel. Choisissez-en un autre." };
  if (error?.code === "weak_password") return { message: "Ce mot de passe est trop facile à deviner. Choisissez-en un autre." };
  if (error) return { message: "Enregistrement impossible : " + error.message };
  redirect("/");
}
