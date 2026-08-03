-- Sprint 1 — profils client/prestataire + véhicules + carte grise
-- Exécuter dans Supabase SQL Editor après Schema-Supabase-complet-Askia.sql,
-- fix-admin-login.sql et rls-admin-read.sql (is_admin() requis)

-- ---------------------------------------------------------------------------
-- 1. Profils — rôles et contraintes
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS adresse text;

-- Assurer la contrainte de rôle (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'prestataire', 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_unique
  ON public.profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Véhicules — colonne type (auto/moto)
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS type text
  CHECK (type IS NULL OR type IN ('auto', 'moto'));

-- ---------------------------------------------------------------------------
-- 3. Helpers RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Profil auto-créé à l'inscription (metadata: telephone, role, nom, prenoms)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_telephone text;
  v_role text;
BEGIN
  v_telephone := COALESCE(NEW.raw_user_meta_data->>'telephone', NEW.phone, '');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  IF v_role NOT IN ('client', 'prestataire', 'admin') THEN
    v_role := 'client';
  END IF;

  IF v_telephone = '' THEN
    v_telephone := 'pending-' || NEW.id::text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE auth_user_id = NEW.id
  ) THEN
    INSERT INTO public.profiles (
      auth_user_id,
      email,
      telephone,
      nom,
      prenoms,
      role
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_telephone,
      NEW.raw_user_meta_data->>'nom',
      NEW.raw_user_meta_data->>'prenoms',
      v_role
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. RLS profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Admin lit tous les profils (via fonction SECURITY DEFINER, pas de récursion)
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. RLS vehicules — client CRUD own, admin read all
-- ---------------------------------------------------------------------------

ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicules_select_own" ON public.vehicules;
CREATE POLICY "vehicules_select_own"
ON public.vehicules FOR SELECT TO authenticated
USING (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "vehicules_insert_own" ON public.vehicules;
CREATE POLICY "vehicules_insert_own"
ON public.vehicules FOR INSERT TO authenticated
WITH CHECK (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "vehicules_update_own" ON public.vehicules;
CREATE POLICY "vehicules_update_own"
ON public.vehicules FOR UPDATE TO authenticated
USING (user_id = public.get_my_profile_id())
WITH CHECK (user_id = public.get_my_profile_id());

DROP POLICY IF EXISTS "vehicules_delete_own" ON public.vehicules;
CREATE POLICY "vehicules_delete_own"
ON public.vehicules FOR DELETE TO authenticated
USING (user_id = public.get_my_profile_id());

-- Admin read (existant — recréer si absent)
DROP POLICY IF EXISTS "vehicules_select_admin" ON public.vehicules;
CREATE POLICY "vehicules_select_admin"
ON public.vehicules FOR SELECT TO authenticated
USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Storage — bucket carte-grise
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('carte-grise', 'carte-grise', false)
ON CONFLICT (id) DO NOTHING;

-- Fichiers dans {auth_user_id}/...
DROP POLICY IF EXISTS "carte_grise_select_own" ON storage.objects;
CREATE POLICY "carte_grise_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'carte-grise'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "carte_grise_insert_own" ON storage.objects;
CREATE POLICY "carte_grise_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'carte-grise'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "carte_grise_update_own" ON storage.objects;
CREATE POLICY "carte_grise_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'carte-grise'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "carte_grise_delete_own" ON storage.objects;
CREATE POLICY "carte_grise_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'carte-grise'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "carte_grise_select_admin" ON storage.objects;
CREATE POLICY "carte_grise_select_admin"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'carte-grise' AND public.is_admin());
