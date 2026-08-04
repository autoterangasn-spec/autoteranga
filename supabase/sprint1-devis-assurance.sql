-- Sprint 1 — devis assurance (demande de souscription)
-- Exécuter dans Supabase SQL Editor après sprint1-client-vehicules.sql
-- (get_my_profile_id() et is_admin() requis)

-- ---------------------------------------------------------------------------
-- 1. Table devis_assurance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.devis_assurance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicule_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  formule text NOT NULL
    CHECK (formule IN ('tiers', 'tiers_plus', 'tous_risques')),
  prime_calculee integer NOT NULL CHECK (prime_calculee > 0),
  statut text NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse')),
  carte_grise_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devis_assurance_vehicule_id
  ON public.devis_assurance(vehicule_id);

CREATE INDEX IF NOT EXISTS idx_devis_assurance_statut
  ON public.devis_assurance(statut);

-- ---------------------------------------------------------------------------
-- 2. RLS — client via véhicule, admin lecture totale
-- ---------------------------------------------------------------------------

ALTER TABLE public.devis_assurance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_select_own" ON public.devis_assurance;
CREATE POLICY "devis_select_own"
ON public.devis_assurance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicules v
    WHERE v.id = devis_assurance.vehicule_id
      AND v.user_id = public.get_my_profile_id()
  )
);

DROP POLICY IF EXISTS "devis_insert_own" ON public.devis_assurance;
CREATE POLICY "devis_insert_own"
ON public.devis_assurance FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vehicules v
    WHERE v.id = devis_assurance.vehicule_id
      AND v.user_id = public.get_my_profile_id()
  )
);

DROP POLICY IF EXISTS "devis_update_own" ON public.devis_assurance;
CREATE POLICY "devis_update_own"
ON public.devis_assurance FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.vehicules v
    WHERE v.id = devis_assurance.vehicule_id
      AND v.user_id = public.get_my_profile_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.vehicules v
    WHERE v.id = devis_assurance.vehicule_id
      AND v.user_id = public.get_my_profile_id()
  )
);

DROP POLICY IF EXISTS "devis_select_admin" ON public.devis_assurance;
CREATE POLICY "devis_select_admin"
ON public.devis_assurance FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "devis_update_admin" ON public.devis_assurance;
CREATE POLICY "devis_update_admin"
ON public.devis_assurance FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
