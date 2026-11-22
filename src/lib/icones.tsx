// Seul fichier qui importe les icônes : Phosphor, trait fin (poids « light »).
// Pour ajouter une icône, l'importer ici et l'exporter sous un nom français.
import { ArrowCounterClockwise, CopySimple, type IconProps } from "@phosphor-icons/react";

const fin: IconProps = { weight: "light", size: 18, "aria-hidden": true };

export function IconeCopier(p: IconProps) { return <CopySimple {...fin} {...p} />; }
export function IconeRetablir(p: IconProps) { return <ArrowCounterClockwise {...fin} {...p} />; }
