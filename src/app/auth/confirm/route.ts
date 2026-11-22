import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { clientSupabase } from "@/lib/supabase/serveur";

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite"];

// Le lien reçu par e-mail arrive ici, sous l'une de deux formes :
// - ?code=...        e-mails par défaut de Supabase : le lien doit être ouvert dans le navigateur
//                    où il a été demandé (sécurité PKCE) ;
// - ?token_hash=...  modèles d'e-mail personnalisés (quand un service d'envoi sera branché) :
//                    marche dans n'importe quel navigateur.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const code = p.get("code");
  const jeton = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  const suite = request.nextUrl.clone();
  suite.search = "";

  const supabase = await clientSupabase();
  let ok = false;
  if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  else if (jeton && type && TYPES.includes(type)) ok = !(await supabase.auth.verifyOtp({ type, token_hash: jeton })).error;

  if (ok) {
    suite.pathname = "/";
    return NextResponse.redirect(suite);
  }
  suite.pathname = "/connexion";
  suite.searchParams.set("erreur", "lien");
  return NextResponse.redirect(suite);
}
