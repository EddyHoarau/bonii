"use client";

import { useActionState } from "react";
import { IconeCle } from "@/lib/icones";
import { seConnecter } from "./actions";

export function FormulaireConnexion() {
  const [etat, action, enCours] = useActionState(seConnecter, null);
  return (
    <form action={action} className="stack-form">
      <div className="field">
        <label htmlFor="email">Adresse e-mail</label>
        <div className="box">
          <input id="email" name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={etat?.email} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="mdp">Mot de passe</label>
        <div className="box">
          <input id="mdp" name="mdp" type="password" autoComplete="current-password" required maxLength={72} />
        </div>
      </div>
      <button type="submit" className="principal" disabled={enCours}>
        <IconeCle />{enCours ? "Connexion…" : "Se connecter"}
      </button>
      {etat && <p className="alerte" role="alert">{etat.message}</p>}
    </form>
  );
}
