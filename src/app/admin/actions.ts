"use server";

import { headers } from "next/headers";
import { clientAdmin } from "@/lib/supabase/admin";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";

export type EtatInvitation = { ok: boolean; message: string } | null;

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function creerEntreprise(_: EtatInvitation, form: FormData): Promise<EtatInvitation> {
  // Revérifié ici : une action serveur peut être appelée directement, sans passer par la page.
  const { data } = await (await clientSupabase()).auth.getClaims();
  if (!estAdmin(data?.claims?.email as string | undefined)) return { ok: false, message: "Accès refusé." };

  const nom = String(form.get("nom") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (nom.length < 1 || nom.length > 200) return { ok: false, message: "Indiquez le nom de l'entreprise (200 caractères au plus)." };
  if (!FORMAT_EMAIL.test(email) || email.length > 254) return { ok: false, message: "L'adresse e-mail du dirigeant ne semble pas valide." };

  const admin = clientAdmin();
  const origine = (await headers()).get("origin") ?? "";

  // 1. Le compte du dirigeant, créé sans e-mail (les modèles d'invitation de Supabase ne sont
  //    modifiables qu'avec un service d'envoi branché). Il se connecte ensuite par lien sur /connexion.
  let userId: string | undefined;
  const cree = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (cree.data.user) userId = cree.data.user.id;
  else if (cree.error?.code === "email_exists") {
    // shortcut: recherche dans les 1 000 premiers comptes, à remplacer par une fonction SQL au-delà.
    const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = liste?.users.find((u) => u.email?.toLowerCase() === email)?.id;
  }
  if (!userId) return { ok: false, message: "Le compte n'a pas pu être créé : " + (cree.error?.message ?? "compte introuvable") + "." };

  // 2. L'entreprise, son dirigeant et son profil de coûts (valeurs d'exemple).
  const { data: ent, error: e1 } = await admin.from("entreprises").insert({ nom }).select("id").single();
  if (e1 || !ent) return { ok: false, message: "Création de l'entreprise impossible : " + e1?.message };
  const { error: e2 } = await admin.from("membres").insert({ entreprise_id: ent.id, user_id: userId, role: "dirigeant" });
  const { error: e3 } = e2 ? { error: null } : await admin.from("profils_couts").insert({ entreprise_id: ent.id });
  if (e2 || e3) {
    await admin.from("entreprises").delete().eq("id", ent.id); // rien de bancal ne reste
    return { ok: false, message: "Rattachement impossible : " + (e2 ?? e3)?.message };
  }

  return {
    ok: true,
    message: `Entreprise « ${nom} » créée. Le dirigeant se connecte sur ${origine}/connexion avec l'adresse ${email} : il recevra son lien.`,
  };
}
