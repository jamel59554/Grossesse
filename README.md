# Duo Grossesse 🤰💞

Application mobile de suivi de grossesse pensée pour **le couple** : le parent qui porte le bébé suit sa grossesse, et le second parent est embarqué dans l'aventure grâce à des **quêtes**, de l'**XP**, des **séries** et un **fil d'équipe synchronisé en temps réel** entre les deux téléphones.

> Informations générales, qui ne remplacent pas l'avis d'un professionnel de santé.

## Fonctionnalités

| Onglet | Contenu |
| --- | --- |
| **Accueil** | Semaine d'aménorrhée (SA + jours), trimestre, compte à rebours, taille du bébé, conseil de la semaine adapté au rôle, jauge d'objectif d'équipe, humeur du jour de l'autre parent, prochain rendez-vous |
| **Quêtes** | Quêtes quotidiennes, hebdomadaires, étapes clés (selon la semaine de grossesse et le rôle) et quêtes d'équipe. Les quêtes de l'autre sont visibles et peuvent être **validées** (+50 % d'XP bonus pour qui l'a faite) |
| **Journal** | Humeur en un geste, symptômes, poids, rendez-vous, notes, partagés avec l'autre parent |
| **Équipe** | Niveaux et titres (Recrue → Légende), séries individuelles et série d'équipe, badges, fil d'activité, encouragements |
| **Réglages** | Prénom et rôle, dates de grossesse, code d'invitation, langue, déconnexion |

**Appairage** : une personne crée l'espace et obtient un code à 6 caractères, l'autre le saisit pour rejoindre le duo (2 membres maximum).

**Temps réel** : chaque action de l'un (quête, validation, humeur, badge…) apparaît instantanément chez l'autre, avec un bandeau de notification dans l'app.

## Stack

- [Expo](https://expo.dev) SDK 57, React Native, TypeScript strict, Expo Router (`src/app`)
- [Supabase](https://supabase.com) : Auth (e-mail + mot de passe), Postgres avec RLS, RPC, Realtime
- TanStack Query (cache + invalidation par Realtime), i18next (français, prêt pour d'autres langues), date-fns, zod
- Jest (`jest-expo`) pour les tests unitaires, un script SQL pour tester la base

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseigner l'URL et la clé publique du projet Supabase
npm start              # Expo : scanner le QR code avec Expo Go, ou « w » pour le web
```

### Base de données

**Supabase en local** (Docker requis) :

```bash
npx supabase start     # applique supabase/migrations et supabase/seed.sql
# copier API_URL et PUBLISHABLE_KEY affichés dans .env
```

**Projet Supabase hébergé** : le projet `duo-grossesse` (ref `ehthrpbpoiekuisxiyng`, région Paris) a déjà reçu les migrations et le seed. Récupérez l'URL et la clé « publishable » dans Project Settings → API.

Pour un autre projet :

```bash
npx supabase link --project-ref <ref>
npx supabase db push                      # applique la migration
psql "<connection string>" -f supabase/seed.sql   # catalogue des quêtes
```

Pour tester rapidement, désactivez la confirmation d'e-mail (Authentication → Providers → Email) ou confirmez les comptes depuis le tableau de bord.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm start` | Serveur de développement Expo |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint (config Expo) |
| `npm test` | Tests unitaires (calculs de grossesse, niveaux, quêtes, journal, cohérence base ↔ traductions) |
| `npm run test:db` | Applique la migration sur un Postgres de test et joue un scénario à deux utilisateurs (RLS, quêtes, XP, séries, badges). Variable `DATABASE_URL` vers un Postgres ≥ 15 |
| `npm run gen:types` | Régénère `src/types/database.ts` depuis la base locale |

## Architecture

```
src/
  app/                 routes Expo Router
    (auth)/            inscription / connexion
    (onboarding)/      rôle → créer ou rejoindre un duo → dates de grossesse
    (tabs)/            Accueil, Quêtes, Journal, Équipe, Réglages
  components/          ui.tsx (primitives), duo.tsx (cartes métier), formulaire de dates
  hooks/               use-duo.ts (requêtes, mutations, synchro Realtime), use-names.ts
  providers/           AuthProvider (session, profil, adhésion au duo)
  lib/                 pregnancy.ts, gamification.ts, journal.ts, describe.ts, supabase.ts
  data/                repères de croissance par semaine, badges
  i18n/locales/fr/     common.json, quests.json, weeks.json
  types/               database.ts (généré), models.ts (alias)
supabase/
  migrations/          schéma, RLS, fonctions de jeu, publication Realtime
  seed.sql             catalogue des quêtes
  harness/             bouchon « auth » + scénario pour npm run test:db
```

### Règles du jeu (côté serveur)

Toute la logique qui touche à l'XP est dans des fonctions Postgres `security definer` : le client ne peut ni s'attribuer de l'XP, ni écrire dans `user_stats`, ni valider sa propre quête.

- `refresh_quests()` génère de façon idempotente et déterministe les quêtes de la période : 3 quotidiennes et 2 hebdomadaires par membre selon son rôle, 2 quêtes d'équipe par semaine, plus les étapes clés de la fenêtre de semaines en cours.
- `complete_quest(id)` : XP (partagée par les deux pour une quête d'équipe), série individuelle, série d'équipe (jours où **chacun** a relevé une quête), badges, fil d'activité.
- `validate_quest(id)` : l'autre membre confirme ; +50 % d'XP pour qui a fait la quête, +2 XP pour qui valide.
- `send_cheer(message)`, `join_couple(code)`, `create_couple(ddr, fuseau)`, `update_pregnancy_dates(ddr)`.

Niveaux : il faut `25 × n × (n − 1)` XP cumulés pour atteindre le niveau *n* (50, 150, 300, 500…).

## Ajouter une langue

Créer `src/i18n/locales/<lng>/` avec les mêmes fichiers que `fr/`, puis l'ajouter à `resources` dans `src/i18n/index.ts`.

## Pistes suivantes

- Notifications push (Expo Notifications + webhook de base de données) quand l'autre relève une quête
- Sélecteur de date natif, photos du ventre (Supabase Storage)
- Quêtes personnalisées créées par le couple
