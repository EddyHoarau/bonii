// Seul fichier qui importe les icônes : Phosphor, trait fin (poids « light »).
// Pour ajouter une icône, l'importer ici et l'exporter sous un nom français.
import { ArrowCounterClockwise, Camera, Check, Columns, CopySimple, DownloadSimple, Envelope, FloppyDisk, Key, NavigationArrow, PaperPlaneRight, Path, Plus, SignOut, Trash } from "@phosphor-icons/react/ssr"; // variante sans contexte React : marche côté serveur et navigateur
import type { IconProps } from "@phosphor-icons/react";

const fin: IconProps = { weight: "light", size: 18, "aria-hidden": true };

export function IconeCopier(p: IconProps) { return <CopySimple {...fin} {...p} />; }
export function IconeRetablir(p: IconProps) { return <ArrowCounterClockwise {...fin} {...p} />; }
export function IconeEnveloppe(p: IconProps) { return <Envelope {...fin} {...p} />; }
export function IconeCle(p: IconProps) { return <Key {...fin} {...p} />; }
export function IconeEnregistrer(p: IconProps) { return <FloppyDisk {...fin} {...p} />; }
export function IconeComparer(p: IconProps) { return <Columns {...fin} {...p} />; }
export function IconeTelecharger(p: IconProps) { return <DownloadSimple {...fin} {...p} />; }
export function IconeSortie(p: IconProps) { return <SignOut {...fin} {...p} />; }
export function IconeAjouter(p: IconProps) { return <Plus {...fin} {...p} />; }
export function IconeFait(p: IconProps) { return <Check {...fin} {...p} />; }
export function IconeSupprimer(p: IconProps) { return <Trash {...fin} {...p} />; }
export function IconePhoto(p: IconProps) { return <Camera {...fin} {...p} />; }
export function IconeItineraire(p: IconProps) { return <Path {...fin} {...p} />; }
export function IconeEnvoyer(p: IconProps) { return <PaperPlaneRight {...fin} {...p} />; }
export function IconeGuidage(p: IconProps) { return <NavigationArrow {...fin} {...p} />; }
