
-- Structure Supabase pour marketplace mobilité Sénégal - Pack Askia Assurances
-- Projet : assurance auto/moto avec génération attestation QR

-- 1. Extension pour UUID
create extension if not exists "uuid-ossp";

-- 2. Table profils utilisateurs de la marketplace
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users,
  telephone text unique not null,
  nom text,
  prenoms text,
  email text,
  role text default 'client' check (role in ('client','prestataire','admin')),
  created_at timestamp with time zone default now()
);

-- 3. Table véhicules
create table vehicules (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  immatriculation text not null,
  numero_chassis text,
  marque text,
  modele text,
  annee smallint check (annee is null or (annee >= 1980 and annee <= 2100)),
  genre text,
  energie text,
  puissance_fiscale int,
  nombre_places int,
  carte_grise_url text,
  created_at timestamptz default now(),
  unique(immatriculation, numero_chassis)
);

-- 4. Table clients assurance miroir Gestassur
create table assurance_clients (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid references vehicules(id),
  num_client_gestassur text, -- ex: 5723C000037
  nom text,
  prenoms text,
  adresse text,
  cellulaire text,
  point_vente_code text, -- 5723
  point_vente_nom text, -- SOPHIE DIOP
  created_at timestamptz default now()
);

-- 5. Table polices - coeur du système
create table polices (
  id uuid primary key default uuid_generate_v4(),
  vehicule_id uuid references vehicules(id),
  assurance_client_id uuid references assurance_clients(id),
  num_police text not null, -- 5723510AS000057
  num_facture text, -- 5723/2026/000008
  num_avenant text, -- 000004E
  type_mouvement text, -- Affaire Nouvelle, Renouvellement
  categorie text, -- CAT 1 PROMENADE ET AFFAIRE
  date_emission date,
  date_effet date,
  date_expiration date not null,
  prime_nette integer,
  accessoire integer,
  fga integer,
  tca integer,
  prime_ttc integer,
  statut text default 'active' check (statut in ('active','expiree','resiliee')),
  created_at timestamptz default now()
);

-- 6. Table documents pack PDF
create table police_documents (
  id uuid primary key default uuid_generate_v4(),
  police_id uuid references polices(id) on delete cascade,
  type_document text check (type_document in ('conditions_particulieres','quittance','facture','attestation')),
  num_attestation text, -- SN003GT84QH
  cle_securite text, -- 6a1d8d
  fichier_url text not null, -- URL Supabase Storage
  fichier_hash text, -- pour vérification intégrité
  diotali_url text, -- https://aas.diotali.com/#/attestation/SN003GT84QH
  qr_code_data text,
  created_at timestamptz default now()
);

-- 7. Table garanties détaillées
create table police_garanties (
  id uuid primary key default uuid_generate_v4(),
  police_id uuid references polices(id) on delete cascade,
  code_garantie text, -- 01.01, 01.31, 01.71
  libelle text, -- RESPONSABILITE CIVILE, RECOURS DES TIERS INCENDIE
  capital_assure text, -- ILLIMITE, 50000000
  prime_garantie integer
);

-- 8. Table commissions et flux financiers - séparation CIMA
create table commissions (
  id uuid primary key default uuid_generate_v4(),
  police_id uuid references polices(id),
  type_flux text check (type_flux in ('prime_assurance','commission_marketplace')),
  -- prime_assurance va directement à Askia, commission_marketplace est ton revenu
  montant_prime_ttc integer,
  commission_point_vente integer, -- 4881 dans l'exemple
  commission_taux_apporteur numeric,
  commission_montant_apporteur integer, -- ce que Askia te reverse
  mode_paiement text, -- Wave, Orange Money, Free Money
  reference_paiement text,
  statut_paiement text default 'en_attente',
  encaissement_date timestamptz,
  created_at timestamptz default now()
);

-- 9. Table rappels expiration
create table rappels (
  id uuid primary key default uuid_generate_v4(),
  police_id uuid references polices(id) on delete cascade,
  vehicule_id uuid references vehicules(id),
  user_id uuid references profiles(id),
  date_expiration date,
  type_rappel text check (type_rappel in ('J-15','J-7','J-2','J0','J+1')),
  canal text check (canal in ('sms','whatsapp','push')),
  statut text default 'a_envoyer',
  envoye_at timestamptz,
  created_at timestamptz default now()
);

-- 10. Fonction pour générer automatiquement les rappels
create or replace function generer_rappels_police()
returns trigger as $$
begin
  insert into rappels (police_id, vehicule_id, user_id, date_expiration, type_rappel)
  values
    (NEW.id, (select vehicule_id from polices where id = NEW.id), (select user_id from vehicules where id = NEW.vehicule_id), NEW.date_expiration, 'J-15'),
    (NEW.id, (select vehicule_id from polices where id = NEW.id), (select user_id from vehicules where id = NEW.vehicule_id), NEW.date_expiration, 'J-7'),
    (NEW.id, (select vehicule_id from polices where id = NEW.id), (select user_id from vehicules where id = NEW.vehicule_id), NEW.date_expiration, 'J-2'),
    (NEW.id, (select vehicule_id from polices where id = NEW.id), (select user_id from vehicules where id = NEW.vehicule_id), NEW.date_expiration, 'J0');
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_rappels
  after insert on polices
  for each row execute function generer_rappels_police();

-- 11. Vues pour tableaux de bord
create view vue_commissions_mensuelles as
select
  date_trunc('month', encaissement_date) as mois,
  sum(montant_prime_ttc) as total_primes_collectees_pour_askia,
  sum(commission_montant_apporteur) as total_commissions_a_recevoir,
  count(*) as nombre_polices
from commissions
where type_flux = 'prime_assurance'
group by 1;

create view vue_expirations_prochaines as
select
  p.id,
  v.immatriculation,
  ac.nom,
  p.num_police,
  pd.num_attestation,
  p.date_expiration,
  p.date_expiration - current_date as jours_restants
from polices p
join vehicules v on p.vehicule_id = v.id
join assurance_clients ac on p.assurance_client_id = ac.id
left join police_documents pd on pd.police_id = p.id and pd.type_document = 'attestation'
where p.date_expiration between current_date and current_date + interval '30 days';

-- Champs à extraire automatiquement des PDF avec une Edge Function
-- Conditions Particulières: num_client, num_police, num_facture, num_avenant, type_mouvement, immat, chassis, marque, genre, energie, puissance, places, garanties, prime_nette, accessoire, fga, tca, prime_ttc, date_emission, date_effet, date_expiration, point_vente
-- Quittance: commission_point_vente, commission_commerciale, détail commissions
-- Facture: référence facture, article CIMA 13
-- Attestation: num_attestation SN..., cle_securite, diotali_url, qr_code_data, immat, date_expiration
