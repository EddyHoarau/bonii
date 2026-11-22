"use client";

import { useActionState } from "react";
import { IconeEnveloppe } from "@/lib/icones";
import { envoyerLien } from "./actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(envoyerLien, null);
  return (
    <form action={action} className="stack-form">
      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <div className="box">
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </div>
      </div>
      <button type="submit" className="principal" disabled={enCours}>
        <IconeEnveloppe />{enCours ? "Envoi…" : "Recevoir mon lien de connexion"}
      </button>
      {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
    </form>
  );
}
