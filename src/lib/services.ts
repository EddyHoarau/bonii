import "server-only";
import { headers } from "next/headers";
import { CONSIGNE_LECTURE, SCHEMA_LECTURE, lireGeocodage, lireLecture, type Position } from "@/lib/tournees";

// Les trois services extérieurs du lot 2. Uniquement côté serveur : les clés ne vont jamais dans le navigateur.
//   ANTHROPIC_API_KEY             lecture des photos (API Claude)
//   GCP_PROJECT_NUMBER            ordre de passage (Google Route Optimization) : numéro du projet Google Cloud
//   GCP_SERVICE_ACCOUNT_EMAIL     adresse du compte de service. Pas de fichier de clé : Vercel prouve l'identité de Bonii (OIDC).
// Le géocodage (service public de l'IGN) n'a pas besoin de clé.

const MODELE_LECTURE = "claude-haiku-5-5";
const VERSION_API_CLAUDE = "2026-10-21";

export type Photo = { type: string; base64: string };

/** Lit les adresses de livraison sur des photos. Les photos sont envoyées à l'API Claude et ne sont pas gardées par Bonii. */
export async function lirePhotosIA(photos: Photo[]): Promise<{ adresses: string[] } | { erreur: string }> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) return { erreur: "La lecture des photos n'est pas encore branchée (clé ANTHROPIC_API_KEY absente). Saisissez les adresses à la main." };
  try {
    const reponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": cle, "anthropic-version": VERSION_API_CLAUDE, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELE_LECTURE,
        max_tokens: 8000,
        messages: [{
          role: "user",
          content: [
            ...photos.map((p) => ({ type: "image", source: { type: "base64", media_type: p.type, data: p.base64 } })),
            { type: "text", text: CONSIGNE_LECTURE },
          ],
        }],
        output_config: { format: { type: "json_schema", schema: SCHEMA_LECTURE } },
      }),
      signal: AbortSignal.timeout(50_000),
    });
    if (!reponse.ok) {
      console.error("Lecture des photos :", reponse.status, (await reponse.text()).slice(0, 500));
      return { erreur: "Le service de lecture a répondu par une erreur (" + reponse.status + "). Réessayez ou saisissez les adresses à la main." };
    }
    return lireLecture(await reponse.json());
  } catch {
    return { erreur: "Le service de lecture ne répond pas. Réessayez ou saisissez les adresses à la main." };
  }
}

/** Position d'une adresse, ou null si elle est introuvable. Lève une erreur si le service ne répond pas. */
async function geocoder(adresse: string): Promise<Position | null> {
  const url = "https://data.geopf.fr/geocodage/search?limit=1&autocomplete=0&q=" + encodeURIComponent(adresse.slice(0, 200));
  const reponse = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  // 400 : le service juge la demande incompréhensible (trop courte, par exemple). C'est une adresse introuvable, pas une panne.
  if (reponse.status === 400) return null;
  if (!reponse.ok) throw new Error("géocodage " + reponse.status);
  return lireGeocodage(await reponse.json());
}

/** Géocode une liste par paquets de 10 (le service accepte 50 demandes par seconde). Null si le service ne répond pas. */
export async function geocoderTout(adresses: string[]): Promise<(Position | null)[] | null> {
  const positions: (Position | null)[] = [];
  try {
    for (let i = 0; i < adresses.length; i += 10) positions.push(...(await Promise.all(adresses.slice(i, i + 10).map(geocoder))));
    return positions;
  } catch {
    return null;
  }
}

const PORTEE_GOOGLE = "https://www.googleapis.com/auth/cloud-platform";

async function postJson(url: string, corps: unknown, jeton?: string) {
  const reponse = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(jeton ? { authorization: "Bearer " + jeton } : {}) },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(10_000),
  });
  if (!reponse.ok) throw new Error(new URL(url).host + " " + reponse.status + " " + (await reponse.text()).slice(0, 300));
  return reponse.json();
}

/**
 * Jeton d'accès Google sans fichier de clé (fédération d'identité) : le badge que Vercel remet à chaque requête
 * est échangé chez Google, qui laisse alors Bonii agir comme le compte de service le temps du calcul.
 * Le pool et le fournisseur Google portent l'ID « vercel » ; seul Bonii en production y est admis (condition côté Google).
 */
async function jetonGoogle(numeroProjet: string, compteService: string) {
  const badge = (await headers()).get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
  if (!badge) throw new Error("badge Vercel (OIDC) absent : le calcul ne marche que sur Vercel");
  const federe = (await postJson("https://sts.googleapis.com/v1/token", {
    grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
    audience: "//iam.googleapis.com/projects/" + numeroProjet + "/locations/global/workloadIdentityPools/vercel/providers/vercel",
    scope: PORTEE_GOOGLE,
    requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
    subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
    subjectToken: badge,
  })) as { access_token: string };
  const compte = (await postJson("https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" + encodeURIComponent(compteService) + ":generateAccessToken",
    { scope: [PORTEE_GOOGLE], lifetime: "600s" }, federe.access_token)) as { accessToken: string };
  return compte.accessToken;
}

/** Envoie la demande d'ordre de passage à Google. Renvoie la réponse brute (à lire avec lireOptimisation), ou le message à afficher. */
export async function ordreDePassage(requete: unknown): Promise<{ reponse: unknown } | { erreur: string }> {
  const numeroProjet = process.env.GCP_PROJECT_NUMBER?.trim(), compteService = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!numeroProjet || !compteService) return { erreur: "Le calcul de l'ordre de passage n'est pas encore branché (réglages GCP_PROJECT_NUMBER et GCP_SERVICE_ACCOUNT_EMAIL absents)." };
  try {
    const jeton = await jetonGoogle(numeroProjet, compteService);
    const reponse = await fetch("https://routeoptimization.googleapis.com/v1/projects/" + encodeURIComponent(numeroProjet) + ":optimizeTours", {
      method: "POST",
      headers: { authorization: "Bearer " + jeton, "content-type": "application/json" },
      body: JSON.stringify(requete),
      signal: AbortSignal.timeout(45_000),
    });
    if (!reponse.ok) {
      console.error("Ordre de passage :", reponse.status, (await reponse.text()).slice(0, 500));
      return { erreur: "Le service de calcul a répondu par une erreur (" + reponse.status + "). Réessayez dans un instant." };
    }
    return { reponse: await reponse.json() };
  } catch (e) {
    console.error("Ordre de passage :", e instanceof Error ? e.message : e);
    return { erreur: "Le service de calcul ne répond pas, ou son branchement à Google est incomplet." };
  }
}
