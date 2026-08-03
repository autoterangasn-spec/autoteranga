-- MVP schema Autoteranga — fondation CIMA (assurance vs marketplace séparés)
-- Exécuter dans Supabase SQL Editor après Schema-Supabase-complet-Askia.sql
-- et supabase/rls-admin-read.sql (is_admin() requis)

-- ---------------------------------------------------------------------------
-- 1. Extensions polices (paiement Askia / BDR)
-- ---------------------------------------------------------------------------

ALTER TABLE public.polices
  ADD COLUMN IF NOT EXISTS statut_paiement_askia text
    DEFAULT 'en_attente'
    CHECK (statut_paiement_askia IN ('en_attente', 'avis_recette_recu'));

ALTER TABLE public.polices
  ADD COLUMN IF NOT EXISTS avis_recette_url text;

ALTER TABLE public.polices
  ADD COLUMN IF NOT EXISTS commission_autoteranga numeric;

ALTER TABLE public.polices
  ADD COLUMN IF NOT EXISTS source_plateforme boolean DEFAULT true;

ALTER TABLE public.polices
  ADD COLUMN IF NOT EXISTS date_souscription date;

-- ---------------------------------------------------------------------------
-- 2. Extensions profiles (future sprint)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS adresse text;

-- telephone existe déjà dans le schéma de base

-- ---------------------------------------------------------------------------
-- 3. Flux assurance (Wave / OM → compte séquestre Askia)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.assurance_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  police_id uuid NOT NULL REFERENCES public.polices(id) ON DELETE RESTRICT,
  montant_prime integer NOT NULL,
  moyen_paiement text NOT NULL CHECK (moyen_paiement IN ('wave', 'om')),
  reference_paiement text,
  statut text NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'confirme', 'echoue')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assurance_transactions_police_id
  ON public.assurance_transactions(police_id);

-- ---------------------------------------------------------------------------
-- 4. Flux marketplace (séparé — sprint futur)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  montant integer NOT NULL,
  type_operation text,
  reference_paiement text,
  statut text NOT NULL DEFAULT 'en_attente',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. Bordereaux de règlement Askia
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bordereaux_reglement (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mois integer NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee integer NOT NULL CHECK (annee >= 2020),
  total_primes integer NOT NULL DEFAULT 0,
  total_commission integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'envoye', 'solde')),
  avis_recette_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (mois, annee)
);

CREATE TABLE IF NOT EXISTS public.bordereau_lignes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bordereau_id uuid NOT NULL
    REFERENCES public.bordereaux_reglement(id) ON DELETE CASCADE,
  police_id uuid REFERENCES public.polices(id) ON DELETE SET NULL,
  n_police text NOT NULL,
  immatriculation text NOT NULL,
  montant_prime integer NOT NULL,
  commission integer NOT NULL DEFAULT 0,
  date_souscription date,
  moyen_paiement text CHECK (moyen_paiement IN ('wave', 'om'))
);

CREATE INDEX IF NOT EXISTS idx_bordereau_lignes_bordereau_id
  ON public.bordereau_lignes(bordereau_id);

-- ---------------------------------------------------------------------------
-- 6. RLS — admin uniquement (is_admin() depuis rls-admin-read.sql)
-- ---------------------------------------------------------------------------

ALTER TABLE public.assurance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bordereaux_reglement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bordereau_lignes ENABLE ROW LEVEL SECURITY;

-- assurance_transactions
DROP POLICY IF EXISTS "assurance_transactions_admin_all" ON public.assurance_transactions;
CREATE POLICY "assurance_transactions_admin_all"
ON public.assurance_transactions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- marketplace_transactions
DROP POLICY IF EXISTS "marketplace_transactions_admin_all" ON public.marketplace_transactions;
CREATE POLICY "marketplace_transactions_admin_all"
ON public.marketplace_transactions FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- bordereaux_reglement
DROP POLICY IF EXISTS "bordereaux_reglement_admin_all" ON public.bordereaux_reglement;
CREATE POLICY "bordereaux_reglement_admin_all"
ON public.bordereaux_reglement FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- bordereau_lignes
DROP POLICY IF EXISTS "bordereau_lignes_admin_all" ON public.bordereau_lignes;
CREATE POLICY "bordereau_lignes_admin_all"
ON public.bordereau_lignes FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- polices : écriture admin pour BDR / avis de recette
DROP POLICY IF EXISTS "polices_update_admin" ON public.polices;
CREATE POLICY "polices_update_admin"
ON public.polices FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "polices_insert_admin" ON public.polices;
CREATE POLICY "polices_insert_admin"
ON public.polices FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Storage bucket avis de recette (bordereaux)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('bordereaux-documents', 'bordereaux-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "bordereaux_documents_admin_select" ON storage.objects;
CREATE POLICY "bordereaux_documents_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bordereaux-documents' AND public.is_admin());

DROP POLICY IF EXISTS "bordereaux_documents_admin_insert" ON storage.objects;
CREATE POLICY "bordereaux_documents_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bordereaux-documents' AND public.is_admin());

DROP POLICY IF EXISTS "bordereaux_documents_admin_update" ON storage.objects;
CREATE POLICY "bordereaux_documents_admin_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bordereaux-documents' AND public.is_admin());

DROP POLICY IF EXISTS "bordereaux_documents_admin_delete" ON storage.objects;
CREATE POLICY "bordereaux_documents_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bordereaux-documents' AND public.is_admin());
