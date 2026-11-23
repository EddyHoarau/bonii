"use client";

import { useRef, useState, useTransition } from "react";
import { IconeAjouter, IconePhoto } from "@/lib/icones";
import { MAX_PHOTOS } from "@/lib/tournees";
import { ajouterAdresses, lirePhotos } from "../actions";

/** Réduit la photo dans le navigateur (grand côté de 1 568 points au plus, JPEG) : envoi léger et lecture moins chère. */
async function reduire(fichier: File): Promise<Blob> {
  const image = await createImageBitmap(fichier);
  const k = Math.min(1, 1568 / Math.max(image.width, image.height));
  const toile = document.createElement("canvas");
  toile.width = Math.round(image.width * k);
  toile.height = Math.round(image.height * k);
  toile.getContext("2d")!.drawImage(image, 0, 0, toile.width, toile.height);
  return new Promise((ok, ko) => toile.toBlob((b) => (b ? ok(b) : ko(new Error("réduction impossible"))), "image/jpeg", 0.85));
}

/** Les photos sont lues par l'IA, le résultat arrive dans la zone de texte : le dirigeant vérifie et corrige avant d'ajouter. */
export function AjoutAdresses({ tourneeId }: { tourneeId: string }) {
  const [texte, setTexte] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, lancer] = useTransition();
  const fichiers = useRef<HTMLInputElement>(null);

  const lire = (liste: FileList | null) => {
    const choisis = Array.from(liste ?? []);
    if (choisis.length === 0) return;
    if (choisis.length > MAX_PHOTOS) { setMessage({ ok: false, texte: "Envoyez " + MAX_PHOTOS + " photos au plus à la fois." }); return; }
    lancer(async () => {
      try {
        const form = new FormData();
        for (const f of choisis) form.append("photos", await reduire(f), "photo.jpg");
        const r = await lirePhotos(form);
        if ("erreur" in r) setMessage({ ok: false, texte: r.erreur });
        else if (r.adresses.length === 0) setMessage({ ok: false, texte: "Aucune adresse trouvée sur ces photos." });
        else {
          setTexte((t) => (t.trim() ? t.trim() + "\n" : "") + r.adresses.join("\n"));
          setMessage({ ok: true, texte: r.adresses.length + " adresses lues. Vérifiez-les et corrigez-les avant de les ajouter." });
        }
      } catch {
        setMessage({ ok: false, texte: "Photo illisible sur cet appareil. Essayez une capture d'écran, ou saisissez les adresses à la main." });
      }
      if (fichiers.current) fichiers.current.value = "";
    });
  };

  const ajouter = () => lancer(async () => {
    const r = await ajouterAdresses(tourneeId, texte);
    setMessage({ ok: r.ok, texte: r.message });
    if (r.ok) setTexte("");
  });

  return (
    <div className="stack-form">
      <div className="actions">
        <label className="bouton-fichier">
          <IconePhoto />Lire des photos ou des captures
          <input ref={fichiers} type="file" accept="image/*" multiple className="sr" disabled={enCours} onChange={(e) => lire(e.target.files)} />
        </label>
        <span className="note">{MAX_PHOTOS} au plus à la fois. Les photos ne sont pas conservées.</span>
      </div>
      <div className="field">
        <label htmlFor="aj-texte">Adresses à ajouter, une par ligne</label>
        <div className="box"><textarea id="aj-texte" rows={6} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={"3 rue des Carmes 54000 Nancy\n8 place Stanislas 54000 Nancy"} /></div>
        <span className="hint">Numéro, rue, code postal, ville. Pas de nom de destinataire.</span>
      </div>
      <div className="actions">
        <button type="button" className="principal" disabled={enCours || !texte.trim()} onClick={ajouter}><IconeAjouter />{enCours ? "En cours…" : "Ajouter ces adresses"}</button>
        {message && <p className={message.ok ? "note" : "alerte"} role="status">{message.texte}</p>}
      </div>
    </div>
  );
}
