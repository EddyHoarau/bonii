"use server";

import { redirect } from "next/navigation";
import { clientSupabase } from "@/lib/supabase/serveur";

export type EtatConnexion = { message: string; email: string } | null;

export async function seConnecter(_: EtatConnexion, form: FormData): Promise<EtatConnexion> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const mdp = String(form.get("mdp") ?? "");
  if (!email || !mdp || email.length > 254 || mdp.length > 72) return { message: "Saisissez votre adresse e-mail et votre mot de passe.", email };

  const { error } = await (await clientSupabase()).auth.signInWithPassword({ email, password: mdp });
  if (error?.status === 429) return { message: "Trop d'essais. Patientez quelques minutes avant de réessayer.", email };
  // Même réponse que l'adresse existe ou non : on ne révèle pas qui a un compte.
  if (error) return { message: "Adresse e-mail ou mot de passe incorrect.", email };
  redirect("/");
}

export async function seDeconnecter() {
  const supabase = await clientSupabase();
  await supabase.auth.signOut();
  redirect("/connexion");
}
