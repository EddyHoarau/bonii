"use client";

import { IconeSupprimer } from "@/lib/icones";

/** Bouton de suppression qui demande confirmation avant d'envoyer l'action. */
export function BoutonSupprimer({ action, id, libelle, question }: { action: (form: FormData) => Promise<void>; id: string; libelle: string; question: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(question)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="discret danger"><IconeSupprimer />{libelle}</button>
    </form>
  );
}
