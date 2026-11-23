import { CadreAccueil } from "@/components/CadreAccueil";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata = { title: "Connexion · Bonii" };

export default function Connexion() {
  return (
    <CadreAccueil titre="Se connecter" sous={<>Votre adresse e-mail et votre mot de passe. Première connexion ou mot de passe oublié : demandez un lien d&apos;accès à votre cabinet, ou à votre dirigeant si vous êtes chauffeur.</>}>
      <FormulaireConnexion />
    </CadreAccueil>
  );
}
