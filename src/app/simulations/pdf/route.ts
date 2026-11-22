import type { NextRequest } from "next/server";
import { clientSupabase } from "@/lib/supabase/serveur";
import { chargerSimulations, lireIds } from "@/lib/comparaison";
import { contenuPdf, fabriquerPdf } from "@/lib/pdf";

/** PDF interne d'une à trois simulations : /simulations/pdf?ids=…&ids=… */
export async function GET(request: NextRequest) {
  const ids = lireIds(request.nextUrl.searchParams.getAll("ids"));
  if (ids.length === 0 || ids.length > 3) return new Response("Choisissez 1 à 3 simulations.", { status: 400 });

  const supabase = await clientSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return new Response("Connexion requise.", { status: 401 });

  // RLS : seules les simulations et l'entreprise du dirigeant connecté reviennent.
  const sims = await chargerSimulations(supabase, ids);
  if (sims.length === 0) return new Response("Simulation introuvable.", { status: 404 });
  const { data: membre } = await supabase.from("membres").select("entreprises(nom)").eq("user_id", data.claims.sub).limit(1).maybeSingle();
  const entreprise = (membre?.entreprises as unknown as { nom: string } | null)?.nom ?? "";

  const contenu = contenuPdf(entreprise, sims, new Date());
  const octets = await fabriquerPdf(contenu);
  const nom = ("bonii-" + contenu.titre).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return new Response(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nom}.pdf"`,
      "Cache-Control": "private, no-store", // document interne : jamais en cache partagé
    },
  });
}
