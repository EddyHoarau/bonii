import Link from "next/link";
import { CadreAccueil } from "@/components/CadreAccueil";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { FormulaireMotDePasse } from "@/app/acces/Formulaires";

export const metadata = { title: "Mot de passe · Bonii" };

// Réservée aux personnes connectées (le proxy renvoie les autres vers /connexion) ; l'action revérifie.
export default function PageMotDePasse() {
  return (
    <CadreAccueil titre="Choisissez votre mot de passe" sous={<>Il vous servira à chaque connexion, avec votre adresse e-mail. Personne d&apos;autre ne le connaît.</>}
      haut={<div className="compte"><Link className="lien" href="/">Retour à l&apos;accueil</Link><BoutonDeconnexion /></div>}>
      <FormulaireMotDePasse />
    </CadreAccueil>
  );
}
