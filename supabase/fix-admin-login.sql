-- Fix : supprimer la policy récursive et garder uniquement "lire son propre profil"
-- Exécuter dans Supabase SQL Editor

-- 1. Supprimer la policy qui cause la récursion infinie
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- 2. S'assurer que la policy "own profile" existe
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- 3. Lier le profil admin (si pas déjà fait)
UPDATE public.profiles
SET auth_user_id = 'aef0cce9-bd9a-4b81-8f84-a51b84897329'
WHERE id = 'fd89947f-63b3-47a9-bb7b-3984dd1f8805';

-- 4. Vérification
SELECT id, auth_user_id, email, role
FROM public.profiles
WHERE email = 'autoterangasn@gmail.com';
