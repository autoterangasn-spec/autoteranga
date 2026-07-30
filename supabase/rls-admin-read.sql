-- Policies RLS lecture admin (polices, vehicules, clients, documents)
-- Exécuter dans Supabase SQL Editor après fix-admin-login.sql

-- Fonction helper (évite la récursion RLS sur profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- POLICES
DROP POLICY IF EXISTS "polices_select_admin" ON public.polices;
CREATE POLICY "polices_select_admin"
ON public.polices FOR SELECT TO authenticated
USING (public.is_admin());

-- VEHICULES
DROP POLICY IF EXISTS "vehicules_select_admin" ON public.vehicules;
CREATE POLICY "vehicules_select_admin"
ON public.vehicules FOR SELECT TO authenticated
USING (public.is_admin());

-- ASSURANCE CLIENTS
DROP POLICY IF EXISTS "assurance_clients_select_admin" ON public.assurance_clients;
CREATE POLICY "assurance_clients_select_admin"
ON public.assurance_clients FOR SELECT TO authenticated
USING (public.is_admin());

-- POLICE DOCUMENTS
DROP POLICY IF EXISTS "police_documents_select_admin" ON public.police_documents;
CREATE POLICY "police_documents_select_admin"
ON public.police_documents FOR SELECT TO authenticated
USING (public.is_admin());

-- VUE EXPIRATIONS (accès direct à la vue)
GRANT SELECT ON public.vue_expirations_prochaines TO authenticated;

-- Vérification
SELECT public.is_admin() AS admin_check;
