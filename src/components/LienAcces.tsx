"use client";

import { useState } from "react";
import { IconeCopier } from "@/lib/icones";

/** Lien d'accès à transmettre à la main : affiché une seule fois, avec un bouton pour le copier. */
export function LienAcces({ lien, pour }: { lien: string; pour: string }) {
  const [copie, setCopie] = useState("");
  const copier = () => navigator.clipboard.writeText(lien).then(
    () => setCopie("Lien copié. Collez-le dans un SMS, WhatsApp ou un e-mail."),
    () => setCopie("Copie impossible ici : sélectionnez le lien à la main."),
  );
  return (
    <div className="lien-acces">
      <p className="note">Lien d&apos;accès pour {pour}. Il ne sert qu&apos;une fois et expire dans 24 h. Envoyez-le à cette personne seulement : il ouvre son compte.</p>
      <div className="box"><input readOnly value={lien} aria-label={"Lien d'accès pour " + pour} onFocus={(e) => e.currentTarget.select()} /></div>
      <div className="actions">
        <button type="button" onClick={copier}><IconeCopier />Copier le lien</button>
        <span className="note" role="status">{copie}</span>
      </div>
    </div>
  );
}
