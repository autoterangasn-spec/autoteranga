# Autoteranga — Dashboard Admin

Marketplace d'assurance auto au Sénégal. Dashboard administrateur connecté à Supabase (projet `wyqdhyiefymfiazqlagk`).

## Prérequis

- Node.js 18+
- Compte admin Supabase : `autoterangasn@gmail.com`
- Clé anon Supabase (Settings → API dans le dashboard Supabase)

## Installation

```bash
cd Documents/Autoteranga
cp .env.local.example .env.local
```

Renseignez dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://wyqdhyiefymfiazqlagk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

En production, `NEXT_PUBLIC_SITE_URL` doit être `https://autoteranga.com` (emails de confirmation et callback auth).

Variables Sprint 2 (paiement + Askia) :

```
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
WAVE_API_KEY=wave_sn_prod_...
WAVE_WEBHOOK_SECRET=wave_sn_WHS_...
WAVE_MOCK=true
ASKIA_WEBHOOK_SECRET=votre_secret_askia
```

- `WAVE_MOCK=true` : simule Wave sans clé API (bouton « Simuler paiement réussi »).
- Webhook Wave : `POST https://votre-domaine/api/webhooks/wave`
- Webhook Askia (stub) : `POST https://votre-domaine/api/webhooks/askia` avec header `Authorization: Bearer {ASKIA_WEBHOOK_SECRET}`

Puis :

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000/login](http://localhost:3000/login).

## Fonctionnalités

| Route | Description |
|-------|-------------|
| `/login` | Connexion email/mot de passe (admin uniquement) |
| `/admin/dashboard` | Tableau `vue_expirations_prochaines` avec filtres et badges urgence |
| `/admin/polices/[id]` | Dossier complet : véhicule, client, prime, documents |
| `/admin/devis` | Devis clients (envoyé, payé, police émise) + validation Askia MVP |
| `/client/devis` | Liste devis client + bouton paiement |
| `/client/devis/[id]/paiement` | Paiement Wave / Orange Money (OM bientôt) |

### Dashboard

- Colonnes : immatriculation, nom, n° police, n° attestation, date expiration, jours restants
- Badges : rouge (< 7j), orange (< 15j), vert (≥ 15j)
- Filtres : recherche texte + urgence

### Fiche police

- Infos véhicule, client Gestassur, découpage prime (nette, accessoire, FGA, TCA, TTC)
- 4 documents avec boutons **Voir** (signed URL 1h) et **Partager WhatsApp**
- QR code Diotali pour l'attestation

## Données de test (prod)

| Élément | Valeur |
|---------|--------|
| Véhicule | AA617SE — PEUGEOT — VF32AKFWF46588181 |
| Client | PENE OMAR GALLA — 5723C000037 |
| Police | 5723510AS000057 — TTC 35 002 FCFA |
| Attestation | SN003GT84QH — Diotali |

## Structure

```
app/
  admin/dashboard/     # Expirations
  admin/polices/[id]/  # Fiche police
  login/               # Auth
  auth/callback/       # Callback Supabase SSR
components/
  admin/               # Tableau, badges, documents, QR
  auth/                # Formulaire login
  ui/                  # shadcn/ui
lib/
  supabase/            # client, server, middleware
  types/database.ts    # Types TypeScript
middleware.ts          # Protection /admin (role admin)
```

## Sécurité

- Middleware vérifie `profiles.auth_user_id` + `role = 'admin'`
- Requêtes via JWT utilisateur (respect RLS)
- Buckets Storage privés : accès via signed URLs authentifiées

## Scripts

```bash
npm run dev      # Développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # ESLint
```

## Déploiement Vercel

URL de prod : `https://autoteranga.com` (domaine custom ; preview Vercel : `https://autoterangacom.vercel.app`)

### 1. Variables d'environnement (obligatoire)

Dans **Vercel → Project → Settings → Environment Variables**, ajoutez :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wyqdhyiefymfiazqlagk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copier depuis `.env.local` (Supabase → Settings → API → anon public) |
| `NEXT_PUBLIC_SITE_URL` | `https://autoteranga.com` |

Cochez **Production**, **Preview** et **Development**.

Puis **Redeploy** le projet (obligatoire : les variables `NEXT_PUBLIC_*` sont injectées au build).

### 2. Supabase Auth — URLs autorisées

Dans **Supabase → Authentication → URL Configuration** :

- **Site URL** : `https://autoteranga.com`
- **Redirect URLs** (ajouter) :
  - `https://autoteranga.com/**`
  - `https://autoterangacom.vercel.app/**`

Sans cette configuration, les liens de confirmation email redirigent vers `localhost:3000`.

### 3. SQL déjà exécuté en prod

Vérifier que ces scripts ont été lancés dans Supabase SQL Editor :

- `supabase/fix-admin-login.sql` — profil admin + RLS profiles
- `supabase/rls-admin-read.sql` — lecture tables admin
- `supabase/sprint1-devis-assurance.sql` — devis assurance
- `supabase/sprint2-paiement-askia.sql` — paiement Wave, statuts paye/police_emise

### 4. Vérification

1. Ouvrir `https://autoterangacom.vercel.app/login`
2. Se connecter avec `autoterangasn@gmail.com`
3. Dashboard → police `5723510AS000057` → Voir PDF / WhatsApp

### Erreur « Email ou mot de passe incorrect » sur Vercel

| Cause | Solution |
|-------|----------|
| Variables env absentes | Ajouter sur Vercel + **Redeploy** |
| Mauvaise anon key | Recopier depuis Supabase dashboard |
| Mot de passe incorrect | Réinitialiser dans Supabase → Authentication → Users |
| Message « Configuration Supabase manquante » | Redéployer après avoir ajouté les variables |
