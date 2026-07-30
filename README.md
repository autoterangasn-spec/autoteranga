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
```

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
