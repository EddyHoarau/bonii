"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientSupabase, estAdmin } from "@/lib/supabase/serveur";

export type EtatConnexion = { message: string; ok: boolean } | null;

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function envoyerLien(_: EtatConnexion, form: FormData): Promise<EtatConnexion> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!FORMAT_EMAIL.test(email) || email.length > 254) return { ok: false, message: "Cette adresse e-mail ne semble pas valide." };

  const origine = (await headers()).get("origin") ?? "";
  const supabase = await clientSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Comptes sur invitation : seul l'administrateur peut créer son propre compte ici.
      shouldCreateUser: estAdmin(email),
      // Reprise dans le modèle d'e-mail ({{ .RedirectTo }}) ; doit figurer dans les adresses autorisées de Supabase.
      emailRedirectTo: origine + "/auth/confirm",
    },
  });
  if (error?.status === 429) return { ok: false, message: "Trop de demandes. Patientez une minute avant de redemander un lien." };
  // Même réponse que l'adresse ait un compte ou non : on ne révèle pas qui est client.
  return { ok: true, message: "Si cette adresse a un compte Bonii, un lien de connexion vient de lui être envoyé. Il est valable une heure." };
}

export async function seDeconnecter() {
  const supabase = await clientSupabase();
  await supabase.auth.signOut();
  redirect("/connexion");
}
