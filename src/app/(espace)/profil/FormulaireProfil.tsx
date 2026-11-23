"use client";

import { useActionState } from "react";
import { IconeEnregistrer } from "@/lib/icones";
import { COUTS, JOURS, type Profil } from "@/lib/profil";
import { enregistrerProfil } from "./actions";

export function FormulaireProfil({ profil }: { profil: Profil }) {
  const [etat, action, enCours] = useActionState(enregistrerProfil, null);
  return (
    <form action={action} className="stack-form">
      <div className="fields">
        {[JOURS, ...COUTS].map(([k, libelle, unite, pas]) => (
          <div className="field" key={k}>
            <label htmlFor={"pf-" + k}>{libelle}</label>
            <div className="box">
              <input id={"pf-" + k} name={k} type="number" inputMode="decimal" min={0} max={k === "jours" ? 31 : undefined} step={pas} required defaultValue={etat?.saisie[k] ?? profil[k as keyof Profil]} />
              <span>{unite}</span>
            </div>
          </div>
        ))}
      </div>
      <button type="submit" className="principal" disabled={enCours}>
        <IconeEnregistrer />{enCours ? "Enregistrement…" : "Enregistrer mes coûts"}
      </button>
      {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message}</p>}
    </form>
  );
}
