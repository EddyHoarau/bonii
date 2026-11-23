// Accès sans e-mail : un lien d'accès à usage unique, transmis à la main, puis un mot de passe.

/** Jeton du lien d'accès (empreinte fournie par Supabase, en hexadécimal). */
export const FORMAT_JETON = /^[0-9a-f]{20,128}$/i;

export const MDP_MIN = 10;
const MDP_MAX = 72; // au-delà, Supabase (bcrypt) ignore la fin

/** Message d'erreur si le mot de passe ne convient pas, sinon null. */
export function erreurMotDePasse(mdp: string, confirmation: string): string | null {
  if (mdp.length < MDP_MIN) return `Le mot de passe doit faire au moins ${MDP_MIN} caractères.`;
  if (mdp.length > MDP_MAX) return `Le mot de passe ne doit pas dépasser ${MDP_MAX} caractères.`;
  if (mdp !== confirmation) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}
