-- Policies Storage pour bucket polices-documents
-- Exécuter si createSignedUrl échoue avec "new row violates" ou "access denied"

-- Lecture des fichiers pour utilisateurs authentifiés
DROP POLICY IF EXISTS "polices_documents_select" ON storage.objects;
CREATE POLICY "polices_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'polices-documents');

-- Admins via fonction is_admin (si déjà créée)
DROP POLICY IF EXISTS "polices_documents_select_admin" ON storage.objects;
CREATE POLICY "polices_documents_select_admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'polices-documents'
  AND public.is_admin()
);
