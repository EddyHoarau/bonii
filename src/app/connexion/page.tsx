import { Marque } from "@/components/Marque";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata = { title: "Connexion · Bonii" };

export default function Connexion() {
  return (
    <div className="app">
      <header className="top"><Marque /></header>
      <section className="panel pad connexion">
        <h2>Se connecter</h2>
        <p className="sub">Votre adresse e-mail et votre mot de passe. Première connexion ou mot de passe oublié : demandez un lien d&apos;accès à votre cabinet, ou à votre dirigeant si vous êtes chauffeur.</p>
        <FormulaireConnexion />
      </section>
    </div>
  );
}
