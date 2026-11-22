"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { entrepriseDuDirigeant } from "@/lib/supabase/serveur";
import { aujourdhuiParis } from "@/lib/echeances";
import { MAX_ARRETS, MAX_PHOTOS, RETENTION_JOURS, decouperAdresses, lireOptimisation, lireTournee, requeteOptimisation } from "@/lib/tournees";
import { geocoderTout, lirePhotosIA, ordreDePassage } from "@/lib/services";

// « saisie » renvoie ce qui a été tapé : React vide le formulaire après l'envoi et le réaffiche avec.
export type EtatTournee = { ok: boolean; message: string; saisie: Record<string, string> } | null;
export type Retour = { ok: boolean; message: string };

const FORMAT_ID = /^[0-9a-f-]{36}$/i;
const CHAMPS = ["nom", "jour", "depart", "heure_depart", "minutes_par_arret"];
const REFUS = "Seul le dirigeant peut préparer une tournée. Reconnectez-vous si besoin.";
const PANNE_ADRESSES = "Le service d'adresses ne répond pas. Réessayez dans un instant.";

type Supabase = Awaited<ReturnType<typeof entrepriseDuDirigeant>>["supabase"];

/** Les adresses ont changé : l'ordre calculé et les heures d'arrivée ne valent plus. */
async function perimer(supabase: Supabase, tourneeId: string) {
  await supabase.from("tournees").update({ optimisee_le: null, km: null, duree_minutes: null }).eq("id", tourneeId);
  await supabase.from("arrets").update({ arrivee: null }).eq("tournee_id", tourneeId);
}

export async function creerTournee(_: EtatTournee, form: FormData): Promise<EtatTournee> {
  const saisie = Object.fromEntries(CHAMPS.map((c) => [c, String(form.get(c) ?? "")]));
  const echec = (message: string) => ({ ok: false, message, saisie });
  // Tout est relu ici : une action serveur peut recevoir n'importe quoi.
  const lu = lireTournee((c) => saisie[c]);
  if ("erreur" in lu) return echec(lu.erreur);

  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return echec(REFUS);

  const positions = await geocoderTout([lu.fiche.depart]);
  if (!positions) return echec(PANNE_ADRESSES);
  const depart = positions[0];
  if (!depart) return echec("Adresse de départ introuvable. Indiquez le numéro, la rue, le code postal et la ville.");

  // Données personnelles : les tournées de plus de 7 jours de l'entreprise sont effacées ici, arrêts compris
  // (en plus de la purge de nuit de la migration 0006, si elle est programmée).
  const limite = new Date(Date.parse(aujourdhuiParis()) - RETENTION_JOURS * 86_400_000).toISOString().slice(0, 10);
  await supabase.from("tournees").delete().eq("entreprise_id", entrepriseId).lt("jour", limite);

  const { data, error } = await supabase.from("tournees")
    .insert({ entreprise_id: entrepriseId, ...lu.fiche, depart: depart.reconnue || lu.fiche.depart, depart_lat: depart.lat, depart_lon: depart.lon })
    .select("id").maybeSingle();
  if (error || !data) return echec("Enregistrement impossible" + (error ? " : " + error.message : "."));
  redirect("/tournees/fiche?id=" + data.id);
}

export async function supprimerTournee(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return;
  const { supabase } = await entrepriseDuDirigeant();
  await supabase.from("tournees").delete().eq("id", id);
  redirect("/tournees");
}

/** Lit les adresses sur des photos déjà réduites par le navigateur. Rien n'est enregistré : le dirigeant vérifie d'abord. */
export async function lirePhotos(form: FormData): Promise<{ adresses: string[] } | { erreur: string }> {
  const { entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return { erreur: REFUS };
  const photos = form.getAll("photos").filter((p): p is File => p instanceof Blob);
  if (photos.length < 1 || photos.length > MAX_PHOTOS) return { erreur: "Envoyez de 1 à " + MAX_PHOTOS + " photos à la fois." };
  if (photos.some((p) => p.type !== "image/jpeg" || p.size > 1_500_000)) return { erreur: "Photo trop lourde ou dans un format inattendu. Réessayez." };
  return lirePhotosIA(await Promise.all(photos.map(async (p) => ({ type: p.type, base64: Buffer.from(await p.arrayBuffer()).toString("base64") }))));
}

/** Ajoute à la tournée les adresses vérifiées (une par ligne) et cherche leur position. */
export async function ajouterAdresses(tourneeId: string, texte: string): Promise<Retour> {
  if (typeof tourneeId !== "string" || !FORMAT_ID.test(tourneeId) || typeof texte !== "string") return { ok: false, message: "Tournée introuvable. Rechargez la page." };
  const adresses = decouperAdresses(texte.slice(0, 60_000));
  if (adresses.length === 0) return { ok: false, message: "Saisissez au moins une adresse, une par ligne." };

  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return { ok: false, message: REFUS };
  // RLS : la tournée d'une autre entreprise ne revient pas.
  const { data: tournee } = await supabase.from("tournees").select("id").eq("id", tourneeId).maybeSingle();
  if (!tournee) return { ok: false, message: "Tournée introuvable. Rechargez la page." };
  const { data: existants } = await supabase.from("arrets").select("ordre").eq("tournee_id", tourneeId).returns<{ ordre: number }[]>();
  const deja = existants ?? [];
  if (deja.length + adresses.length > MAX_ARRETS) return { ok: false, message: "Une tournée compte " + MAX_ARRETS + " arrêts au plus (" + deja.length + " déjà saisis)." };

  const positions = await geocoderTout(adresses);
  if (!positions) return { ok: false, message: PANNE_ADRESSES };
  const suite = Math.max(0, ...deja.map((a) => a.ordre));
  const { error } = await supabase.from("arrets").insert(adresses.map((adresse, i) => {
    const p = positions[i];
    return { entreprise_id: entrepriseId, tournee_id: tourneeId, adresse, reconnue: p?.reconnue ?? null, lat: p?.lat ?? null, lon: p?.lon ?? null, fiable: p?.fiable ?? false, ordre: suite + i + 1 };
  }));
  if (error) return { ok: false, message: "Enregistrement impossible : " + error.message };
  await perimer(supabase, tourneeId);
  refresh();
  const douteuses = positions.filter((p) => !p?.fiable).length;
  return { ok: true, message: adresses.length + (adresses.length > 1 ? " adresses ajoutées" : " adresse ajoutée") + (douteuses ? ", dont " + douteuses + " à vérifier." : ".") };
}

export async function corrigerArret(form: FormData) {
  const id = String(form.get("id") ?? ""), adresse = decouperAdresses(String(form.get("adresse") ?? ""))[0];
  if (!FORMAT_ID.test(id) || !adresse) return;
  const { supabase } = await entrepriseDuDirigeant();
  const positions = await geocoderTout([adresse]);
  if (!positions) return; // service en panne : on ne touche à rien
  const p = positions[0];
  const { data } = await supabase.from("arrets")
    .update({ adresse, reconnue: p?.reconnue ?? null, lat: p?.lat ?? null, lon: p?.lon ?? null, fiable: p?.fiable ?? false })
    .eq("id", id).select("tournee_id").maybeSingle();
  if (data) await perimer(supabase, data.tournee_id as string);
  refresh();
}

export async function supprimerArret(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return;
  const { supabase } = await entrepriseDuDirigeant();
  const { data } = await supabase.from("arrets").delete().eq("id", id).select("tournee_id").maybeSingle();
  if (data) await perimer(supabase, data.tournee_id as string);
  refresh();
}

/** Calcule l'ordre de passage des arrêts qui ont une position et note l'heure d'arrivée à chacun. */
export async function optimiser(_: Retour | null, form: FormData): Promise<Retour> {
  const id = String(form.get("id") ?? "");
  if (!FORMAT_ID.test(id)) return { ok: false, message: "Tournée introuvable. Rechargez la page." };
  const { supabase, entrepriseId } = await entrepriseDuDirigeant();
  if (!entrepriseId) return { ok: false, message: REFUS };

  const [{ data: tournee }, { data: liste }] = await Promise.all([
    supabase.from("tournees").select("jour, heure_depart, minutes_par_arret, depart_lat, depart_lon").eq("id", id)
      .maybeSingle<{ jour: string; heure_depart: string; minutes_par_arret: number; depart_lat: number; depart_lon: number }>(),
    supabase.from("arrets").select("id, lat, lon").eq("tournee_id", id).order("ordre").returns<{ id: string; lat: number | null; lon: number | null }[]>(),
  ]);
  if (!tournee) return { ok: false, message: "Tournée introuvable. Rechargez la page." };
  const tous = liste ?? [];
  const places = tous.filter((a): a is { id: string; lat: number; lon: number } => a.lat !== null && a.lon !== null);
  if (places.length < 2) return { ok: false, message: "Il faut au moins deux adresses reconnues pour calculer un ordre de passage." };

  const envoi = await ordreDePassage(requeteOptimisation(tournee, places));
  if ("erreur" in envoi) return { ok: false, message: envoi.erreur };
  const resultat = lireOptimisation(envoi.reponse, places.length);
  if ("erreur" in resultat) return { ok: false, message: resultat.erreur };

  // Les arrêts visités prennent leur rang et leur heure ; les autres (sans position, ou écartés par le calcul) passent à la fin.
  const visites = new Set(resultat.passages.map((p) => places[p.index].id));
  const reste = tous.filter((a) => !visites.has(a.id));
  const majs = [
    ...resultat.passages.map((p, i) => supabase.from("arrets").update({ ordre: i + 1, arrivee: p.arrivee }).eq("id", places[p.index].id)),
    ...reste.map((a, i) => supabase.from("arrets").update({ ordre: resultat.passages.length + i + 1, arrivee: null }).eq("id", a.id)),
  ];
  const echecs = (await Promise.all(majs)).filter((r) => r.error).length;
  if (echecs) return { ok: false, message: "L'ordre a été calculé mais n'a pas pu être enregistré en entier. Relancez le calcul." };
  await supabase.from("tournees").update({ optimisee_le: new Date().toISOString(), km: resultat.km, duree_minutes: resultat.minutes }).eq("id", id);
  refresh();
  return { ok: true, message: "Ordre de passage calculé pour " + resultat.passages.length + " arrêts" + (reste.length ? ", " + reste.length + (reste.length > 1 ? " laissés" : " laissé") + " à la fin." : ".") };
}
