"use client";

import { STATUTS, type Statut } from "@/lib/simulations";
import { changerStatut } from "./actions";

/** Le statut s'enregistre dès qu'on le change. */
export function ChoixStatut({ id, statut, nom }: { id: string; statut: Statut; nom: string }) {
  return (
    <form action={changerStatut}>
      <input type="hidden" name="id" value={id} />
      <div className="box">
        <select name="statut" defaultValue={statut} aria-label={"Statut de " + nom} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
          {Object.entries(STATUTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </form>
  );
}
