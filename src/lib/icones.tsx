// Seul fichier qui importe les icônes : Phosphor, trait fin (poids « light »).
// Pour ajouter une icône, l'importer ici et l'exporter sous un nom français.
import { ArrowCounterClockwise, Columns, CopySimple, DownloadSimple, Envelope, FloppyDisk, SignOut } from "@phosphor-icons/react/ssr"; // variante sans contexte React : marche côté serveur et navigateur
import type { IconProps } from "@phosphor-icons/react";

const fin: IconProps = { weight: "light", size: 18, "aria-hidden": true };

export function IconeCopier(p: IconProps) { return <CopySimple {...fin} {...p} />; }
export function IconeRetablir(p: IconProps) { return <ArrowCounterClockwise {...fin} {...p} />; }
export function IconeEnveloppe(p: IconProps) { return <Envelope {...fin} {...p} />; }
export function IconeEnregistrer(p: IconProps) { return <FloppyDisk {...fin} {...p} />; }
export function IconeComparer(p: IconProps) { return <Columns {...fin} {...p} />; }
export function IconeTelecharger(p: IconProps) { return <DownloadSimple {...fin} {...p} />; }
export function IconeSortie(p: IconProps) { return <SignOut {...fin} {...p} />; }
