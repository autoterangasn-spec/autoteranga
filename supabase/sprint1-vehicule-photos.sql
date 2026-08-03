-- Sprint 1 — photos véhicule (annonces vente/location)
-- Exécuter dans Supabase SQL Editor après Schema-Supabase-complet-Askia.sql
-- et sprint1-client-vehicules.sql

-- ---------------------------------------------------------------------------
-- Colonne photos_urls (chemins storage, 1ère photo = vignette principale)
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS photos_urls text[];

-- ---------------------------------------------------------------------------
-- Storage — bucket vehicule-photos
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicule-photos', 'vehicule-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Fichiers dans {auth_user_id}/...
DROP POLICY IF EXISTS "vehicule_photos_select_own" ON storage.objects;
CREATE POLICY "vehicule_photos_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicule-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "vehicule_photos_insert_own" ON storage.objects;
CREATE POLICY "vehicule_photos_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicule-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "vehicule_photos_update_own" ON storage.objects;
CREATE POLICY "vehicule_photos_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vehicule-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "vehicule_photos_delete_own" ON storage.objects;
CREATE POLICY "vehicule_photos_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicule-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "vehicule_photos_select_admin" ON storage.objects;
CREATE POLICY "vehicule_photos_select_admin"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'vehicule-photos' AND public.is_admin());
