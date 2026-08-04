-- Sprint 2 — Paiement Mobile Money (Wave/OM) + validation Askia
-- Exécuter dans Supabase SQL Editor après sprint1-devis-assurance.sql
-- (get_my_profile_id() et is_admin() requis)

-- ---------------------------------------------------------------------------
-- 1. Étendre devis_assurance (statuts paye / police_emise + champs police)
-- ---------------------------------------------------------------------------

ALTER TABLE public.devis_assurance
  DROP CONSTRAINT IF EXISTS devis_assurance_statut_check;

ALTER TABLE public.devis_assurance
  ADD CONSTRAINT devis_assurance_statut_check
  CHECK (statut IN ('brouillon', 'envoye', 'accepte', 'refuse', 'paye', 'police_emise'));

ALTER TABLE public.devis_assurance
  ADD COLUMN IF NOT EXISTS police_id uuid REFERENCES public.polices(id) ON DELETE SET NULL;

ALTER TABLE public.devis_assurance
  ADD COLUMN IF NOT EXISTS num_police text;

ALTER TABLE public.devis_assurance
  ADD COLUMN IF NOT EXISTS num_attestation text;

ALTER TABLE public.devis_assurance
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_devis_assurance_police_id
  ON public.devis_assurance(police_id);

CREATE INDEX IF NOT EXISTS idx_devis_assurance_paid_at
  ON public.devis_assurance(paid_at);

-- ---------------------------------------------------------------------------
-- 2. Lier assurance_transactions aux devis (police_id nullable avant émission)
-- ---------------------------------------------------------------------------

ALTER TABLE public.assurance_transactions
  ALTER COLUMN police_id DROP NOT NULL;

ALTER TABLE public.assurance_transactions
  ADD COLUMN IF NOT EXISTS devis_id uuid REFERENCES public.devis_assurance(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assurance_transactions_devis_id
  ON public.assurance_transactions(devis_id);

-- ---------------------------------------------------------------------------
-- 3. RLS assurance_transactions — client (via devis) + admin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "assurance_transactions_select_own" ON public.assurance_transactions;
CREATE POLICY "assurance_transactions_select_own"
ON public.assurance_transactions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.devis_assurance d
    JOIN public.vehicules v ON v.id = d.vehicule_id
    WHERE d.id = assurance_transactions.devis_id
      AND v.user_id = public.get_my_profile_id()
  )
);

DROP POLICY IF EXISTS "assurance_transactions_insert_own" ON public.assurance_transactions;
CREATE POLICY "assurance_transactions_insert_own"
ON public.assurance_transactions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.devis_assurance d
    JOIN public.vehicules v ON v.id = d.vehicule_id
    WHERE d.id = assurance_transactions.devis_id
      AND v.user_id = public.get_my_profile_id()
      AND d.statut = 'envoye'
  )
);

-- Admin update devis (déjà présent sprint1, recréé pour idempotence)
DROP POLICY IF EXISTS "devis_update_admin" ON public.devis_assurance;
CREATE POLICY "devis_update_admin"
ON public.devis_assurance FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
