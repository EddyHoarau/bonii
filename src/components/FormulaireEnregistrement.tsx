"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Saisie } from "@/moteur";
import { IconeEnregistrer } from "@/lib/icones";
import { STATUTS, type TypeSimulation } from "@/lib/simulations";
import { enregistrerSimulation } from "@/app/simulations/actions";

/** Fige le calcul affiché : toutes les valeurs, coûts compris, telles qu'à cet instant. */
export function FormulaireEnregistrement({ type, saisie }: { type: TypeSimulation; saisie: Saisie }) {
  const [etat, action, enCours] = useActionState(enregistrerSimulation, null);
  return (
    <section className="panel pad">
      <h2>Enregistrer {type === "tournee" ? "cette tournée" : "cette course"}</h2>
      <p className="sub">Les chiffres sont gardés tels quels, même si vos coûts changent ensuite.</p>
      <form action={action} className="stack-form">
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="saisie" value={JSON.stringify(saisie)} />
        <div className="fields">
          <div className="field">
            <label htmlFor="sim-nom">Nom</label>
            <div className="box"><input id="sim-nom" name="nom" required maxLength={200} placeholder={type === "tournee" ? "Tournée Nord, lot 3" : "Course Lyon"} /></div>
          </div>
          <div className="field">
            <label htmlFor="sim-donneur">Donneur d&apos;ordre</label>
            <div className="box"><input id="sim-donneur" name="donneur" maxLength={200} /></div>
          </div>
          <div className="field">
            <label htmlFor="sim-date">Date</label>
            <div className="box"><input id="sim-date" name="date" type="date" /></div>
            <span className="hint">Aujourd&apos;hui si vide</span>
          </div>
          <div className="field">
            <label htmlFor="sim-statut">Statut</label>
            <div className="box">
              <select id="sim-statut" name="statut" defaultValue="a_l_etude">
                {Object.entries(STATUTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="principal" disabled={enCours}><IconeEnregistrer />{enCours ? "Enregistrement…" : "Enregistrer"}</button>
          {etat && <p className={etat.ok ? "note" : "alerte"} role="status">{etat.message} {etat.ok && <Link className="lien" href="/simulations">Voir mes simulations</Link>}</p>}
        </div>
      </form>
    </section>
  );
}
