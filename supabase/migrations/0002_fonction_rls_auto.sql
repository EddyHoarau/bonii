-- 0002 : la fonction public.rls_auto_enable() est créée par Supabase quand on coche
-- « Enable RLS on new tables automatically ». Elle ne sert qu'au déclencheur ensure_rls ;
-- personne n'a besoin de l'appeler (alerte du Security Advisor). Le déclencheur continue de marcher.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
