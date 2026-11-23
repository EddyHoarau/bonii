import { Suspense } from "react";
import { CadreAccueil } from "@/components/CadreAccueil";
import { FormulaireAcces } from "./Formulaires";

export const metadata = { title: "Votre accès · Bonii", referrer: "no-referrer" };

// Page publique : la personne arrive ici depuis le lien d'accès qu'on lui a transmis.
export default function PageAcces({ searchParams }: PageProps<"/acces">) {
  return (
    <CadreAccueil titre="Bienvenue sur Bonii" sous="Ouvrez votre accès, puis choisissez votre mot de passe. Vous vous connecterez ensuite avec votre adresse e-mail et ce mot de passe.">
      <Suspense><Jeton searchParams={searchParams} /></Suspense>
    </CadreAccueil>
  );
}

async function Jeton({ searchParams }: { searchParams: PageProps<"/acces">["searchParams"] }) {
  const { jeton } = await searchParams;
  return <FormulaireAcces jeton={typeof jeton === "string" ? jeton : ""} />;
}
