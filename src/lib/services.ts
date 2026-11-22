import "server-only";
import { createSign } from "node:crypto";
import { CONSIGNE_LECTURE, SCHEMA_LECTURE, lireGeocodage, lireLecture, type Position } from "@/lib/tournees";

// Les trois services extérieurs du lot 2. Uniquement côté serveur : les clés ne vont jamais dans le navigateur.
//   ANTHROPIC_API_KEY             lecture des photos (API Claude)
//   GOOGLE_SERVICE_ACCOUNT_JSON   ordre de passage (Google Route Optimization), contenu du fichier de clé du compte de service
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

const b64 = (v: string | Buffer) => Buffer.from(v).toString("base64url");

/** Jeton d'accès Google à partir du compte de service (échange d'un jeton signé, méthode standard de Google). */
async function jetonGoogle(compte: { client_email: string; private_key: string; token_uri?: string }) {
  const maintenant = Math.floor(Date.now() / 1000), cible = compte.token_uri ?? "https://oauth2.googleapis.com/token";
  const aSigner = b64(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64(JSON.stringify({
    iss: compte.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud: cible, iat: maintenant, exp: maintenant + 600,
  }));
  const signature = createSign("RSA-SHA256").update(aSigner).sign(compte.private_key);
  const reponse = await fetch(cible, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: aSigner + "." + b64(signature) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!reponse.ok) throw new Error("jeton Google " + reponse.status + " " + (await reponse.text()).slice(0, 300));
  return ((await reponse.json()) as { access_token: string }).access_token;
}

/** Envoie la demande d'ordre de passage à Google. Renvoie la réponse brute (à lire avec lireOptimisation), ou le message à afficher. */
export async function ordreDePassage(requete: unknown): Promise<{ reponse: unknown } | { erreur: string }> {
  const brut = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!brut) return { erreur: "Le calcul de l'ordre de passage n'est pas encore branché (clé GOOGLE_SERVICE_ACCOUNT_JSON absente)." };
  try {
    const compte = JSON.parse(brut) as { client_email: string; private_key: string; project_id: string; token_uri?: string };
    const jeton = await jetonGoogle(compte);
    const reponse = await fetch("https://routeoptimization.googleapis.com/v1/projects/" + encodeURIComponent(compte.project_id) + ":optimizeTours", {
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
    return { erreur: "Le service de calcul ne répond pas, ou sa clé est mal renseignée." };
  }
}
