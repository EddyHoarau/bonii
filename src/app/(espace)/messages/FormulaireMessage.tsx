"use client";

import { useActionState } from "react";
import { IconeEnvoyer } from "@/lib/icones";
import { envoyerMessage } from "./actions";

export function FormulaireMessage({ fil }: { fil: string }) {
  const [etat, action, enCours] = useActionState(envoyerMessage, null);
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="fil" value={fil} />
      <div className="field">
        <label htmlFor="me-texte">Votre message</label>
        <div className="box"><textarea id="me-texte" name="texte" rows={3} required maxLength={2000} defaultValue={etat?.saisie} /></div>
      </div>
      <div className="actions">
        <button type="submit" className="principal" disabled={enCours}><IconeEnvoyer />{enCours ? "Envoi…" : "Envoyer"}</button>
        {etat && !etat.ok && <p className="alerte" role="status">{etat.message}</p>}
      </div>
    </form>
  );
}
