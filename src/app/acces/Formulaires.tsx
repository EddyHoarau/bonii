"use client";

import { useActionState } from "react";
import { IconeCle } from "@/lib/icones";
import { MDP_MIN } from "@/lib/acces";
import { choisirMotDePasse, ouvrirAcces } from "./actions";

export function FormulaireAcces({ jeton }: { jeton: string }) {
  const [etat, action, enCours] = useActionState(ouvrirAcces, null);
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="jeton" value={jeton} />
      <button type="submit" className="principal" disabled={enCours}><IconeCle />{enCours ? "Ouverture…" : "Ouvrir mon accès"}</button>
      {etat && <p className="alerte" role="alert">{etat.message}</p>}
    </form>
  );
}

export function FormulaireMotDePasse() {
  const [etat, action, enCours] = useActionState(choisirMotDePasse, null);
  return (
    <form action={action} className="stack-form">
      <div className="field">
        <label htmlFor="mdp">Nouveau mot de passe</label>
        <div className="box"><input id="mdp" name="mdp" type="password" autoComplete="new-password" required minLength={MDP_MIN} maxLength={72} /></div>
        <span className="hint">{MDP_MIN} caractères au moins. Une phrase courte est plus facile à retenir.</span>
      </div>
      <div className="field">
        <label htmlFor="confirmation">Le même, une seconde fois</label>
        <div className="box"><input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={MDP_MIN} maxLength={72} /></div>
      </div>
      <button type="submit" className="principal" disabled={enCours}><IconeCle />{enCours ? "Enregistrement…" : "Enregistrer mon mot de passe"}</button>
      {etat && <p className="alerte" role="alert">{etat.message}</p>}
    </form>
  );
}
