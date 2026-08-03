-- Sprint 1 — détails véhicule (marque, modèle, année, description, prix d'achat)
-- Exécuter dans Supabase SQL Editor après Schema-Supabase-complet-Askia.sql
-- et sprint1-client-vehicules.sql

-- ---------------------------------------------------------------------------
-- Colonnes marque / modèle / année / description / prix_achat
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS marque text;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS modele text;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS annee integer;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS prix_achat integer;

-- Contrainte année 1980–2030 (remplace l'éventuelle contrainte sprint1 1980–2100)
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'vehicules'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%annee%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.vehicules DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END $$;

ALTER TABLE public.vehicules
  ADD CONSTRAINT vehicules_annee_check
  CHECK (annee IS NULL OR (annee >= 1980 AND annee <= 2030));
