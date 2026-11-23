import Link from "next/link";
import { Marque } from "@/components/Marque";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { FormulaireMotDePasse } from "@/app/acces/Formulaires";

export const metadata = { title: "Mot de passe · Bonii" };

// Réservée aux personnes connectées (le proxy renvoie les autres vers /connexion) ; l'action revérifie.
export default function PageMotDePasse() {
  return (
    <div className="app">
      <div className="compte"><Link className="lien" href="/">Retour à l&apos;accueil</Link><BoutonDeconnexion /></div>
      <header className="top"><Marque /></header>
      <section className="panel pad connexion">
        <h2>Choisissez votre mot de passe</h2>
        <p className="sub">Il vous servira à chaque connexion, avec votre adresse e-mail. Personne d&apos;autre ne le connaît.</p>
        <FormulaireMotDePasse />
      </section>
    </div>
  );
}
