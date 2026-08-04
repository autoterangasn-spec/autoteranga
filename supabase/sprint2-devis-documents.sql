-- Sprint 2 — Documents police (attestation + facture) sur devis_assurance
-- Exécuter dans Supabase SQL Editor après sprint2-paiement-askia.sql

ALTER TABLE public.devis_assurance
  ADD COLUMN IF NOT EXISTS attestation_url text;

ALTER TABLE public.devis_assurance
  ADD COLUMN IF NOT EXISTS facture_url text;

COMMENT ON COLUMN public.devis_assurance.attestation_url IS
  'Chemin Supabase Storage (bucket polices-documents) — PDF attestation Askia';

COMMENT ON COLUMN public.devis_assurance.facture_url IS
  'Chemin Supabase Storage (bucket polices-documents) — PDF facture Askia';

-- Upload admin vers polices-documents
DROP POLICY IF EXISTS "polices_documents_insert_admin" ON storage.objects;
CREATE POLICY "polices_documents_insert_admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'polices-documents'
  AND public.is_admin()
);

DROP POLICY IF EXISTS "polices_documents_update_admin" ON storage.objects;
CREATE POLICY "polices_documents_update_admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'polices-documents'
  AND public.is_admin()
);
