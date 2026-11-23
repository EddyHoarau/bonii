"use server";

import { headers } from "next/headers";
import { clientAdmin, compteExistant, compteParEmail, lienAcces } from "@/lib/supabase/admin";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";

export type EtatInvitation = { ok: boolean; message: string; lien?: string; pour?: string } | null;

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Revérifié dans chaque action : une action serveur peut être appelée directement, sans passer par la page.
async function adminConnecte() {
  const { data } = await (await clientSupabase()).auth.getClaims();
  return estAdmin(data?.claims?.email as string | undefined);
}

export async function creerEntreprise(_: EtatInvitation, form: FormData): Promise<EtatInvitation> {
  if (!(await adminConnecte())) return { ok: false, message: "Accès refusé." };

  const nom = String(form.get("nom") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (nom.length < 1 || nom.length > 200) return { ok: false, message: "Indiquez le nom de l'entreprise (200 caractères au plus)." };
  if (!FORMAT_EMAIL.test(email) || email.length > 254) return { ok: false, message: "L'adresse e-mail du dirigeant ne semble pas valide." };

  const admin = clientAdmin();
  const origine = (await headers()).get("origin") ?? "";

  // 1. Le compte du dirigeant, sans e-mail : on lui remet un lien d'accès à la main.
  const compte = await compteParEmail(admin, email);
  if ("erreur" in compte) return { ok: false, message: "Le compte n'a pas pu être créé : " + compte.erreur + "." };
  const userId = compte.userId;

  // 2. L'entreprise, son dirigeant et son profil de coûts (valeurs d'exemple).
  const { data: ent, error: e1 } = await admin.from("entreprises").insert({ nom }).select("id").single();
  if (e1 || !ent) return { ok: false, message: "Création de l'entreprise impossible : " + e1?.message };
  const { error: e2 } = await admin.from("membres").insert({ entreprise_id: ent.id, user_id: userId, role: "dirigeant" });
  const { error: e3 } = e2 ? { error: null } : await admin.from("profils_couts").insert({ entreprise_id: ent.id });
  if (e2 || e3) {
    await admin.from("entreprises").delete().eq("id", ent.id); // rien de bancal ne reste
    return { ok: false, message: "Rattachement impossible : " + (e2 ?? e3)?.message };
  }

  const lien = await lienAcces(admin, email, origine);
  return lien
    ? { ok: true, message: `Entreprise « ${nom} » créée.`, lien, pour: email }
    : { ok: true, message: `Entreprise « ${nom} » créée, mais le lien d'accès n'a pas pu être fabriqué. Utilisez « Nouveau lien d'accès » ci-dessous.` };
}

/** Nouveau lien d'accès pour un compte existant (première connexion manquée, mot de passe oublié). */
export async function nouveauLien(_: EtatInvitation, form: FormData): Promise<EtatInvitation> {
  if (!(await adminConnecte())) return { ok: false, message: "Accès refusé." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!FORMAT_EMAIL.test(email) || email.length > 254) return { ok: false, message: "Cette adresse e-mail ne semble pas valide." };

  const admin = clientAdmin();
  // On ne crée rien ici : seulement pour une adresse qui a déjà un compte.
  if (!(await compteExistant(admin, email))) return { ok: false, message: "Aucun compte Bonii pour cette adresse." };
  const lien = await lienAcces(admin, email, (await headers()).get("origin") ?? "");
  return lien ? { ok: true, message: "Nouveau lien prêt.", lien, pour: email } : { ok: false, message: "Le lien n'a pas pu être fabriqué. Réessayez." };
}
