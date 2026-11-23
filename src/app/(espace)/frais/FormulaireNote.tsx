"use client";

import { useActionState } from "react";
import { IconeAjouter } from "@/lib/icones";
import { NATURES } from "@/lib/equipe";
import { ajouterNote } from "./actions";

export function FormulaireNote({ aujourdhui }: { aujourdhui: string }) {
  const [etat, action, enCours] = useActionState(ajouterNote, null);
  return (
    <form action={action} className="stack-form">
      <div className="fields">
        <div className="field">
          <label htmlFor="nf-jour">Date</label>
          <div className="box"><input id="nf-jour" name="jour" type="date" required defaultValue={etat?.saisie.jour ?? aujourdhui} /></div>
        </div>
        <div className="field">
          <label htmlFor="nf-nature">Nature</label>
          <div className="box">
            <select id="nf-nature" name="nature" defaultValue={etat?.saisie.nature ?? NATURES[0]}>
              {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="nf-montant">Montant payé</label>
          <div className="box"><input id="nf-montant" name="montant" type="number" inputMode="decimal" min={0.01} step={0.01} required defaultValue={etat?.saisie.montant} /><span>€</span></div>
        </div>
        <div className="field large">
          <label htmlFor="nf-commentaire">Commentaire</label>
          <div className="box"><input id="nf-commentaire" name="commentaire" maxLength={500} placeholder="Plein à Toul" defaultValue={etat?.saisie.commentaire} /></div>
          <span className="hint">Gardez le ticket : il n&apos;est pas encore possible de le joindre ici.</span>
        </div>
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}><IconeAjouter />{enCours ? "Envoi…" : "Déposer cette note"}</button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
