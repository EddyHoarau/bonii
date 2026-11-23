"use client";

import { useActionState } from "react";
import { IconeAjouter } from "@/lib/icones";
import { ajouterRelance } from "./actions";

export function FormulaireRelance({ donneurId }: { donneurId: string }) {
  const [etat, action, enCours] = useActionState(ajouterRelance, null);
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="donneur" value={donneurId} />
      <div className="fields">
        <div className="field">
          <label htmlFor="re-date">À relancer le</label>
          <div className="box"><input id="re-date" name="date" type="date" required defaultValue={etat?.saisie.date} /></div>
        </div>
        <div className="field large">
          <label htmlFor="re-objet">Objet</label>
          <div className="box"><input id="re-objet" name="objet" required maxLength={300} placeholder="Rappeler après l'envoi du prix" defaultValue={etat?.saisie.objet} /></div>
        </div>
      </div>
      <div className="actions">
        <button type="submit" disabled={enCours}><IconeAjouter />{enCours ? "Enregistrement…" : "Prévoir cette relance"}</button>
        {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
