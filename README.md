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

**Projet Supabase hébergé** : le projet `duo-grossesse` (ref `ehthrpbpoiekuisxiyng`, région Paris) a déjà reçu les migrations, le seed et la fonction `notify-partner`. Récupérez l'URL et la clé « publishable » dans Project Settings → API.

Pour un autre projet :

```bash
npx supabase link --project-ref <ref>
npx supabase db push                      # applique les migrations
psql "<connection string>" -f supabase/seed.sql   # catalogue des quêtes
npx supabase functions deploy notify-partner --no-verify-jwt
```

puis, dans l'éditeur SQL, activez l'envoi des notifications :

```sql
insert into private.settings (key, value)
values ('notify_partner_url', 'https://<ref>.supabase.co/functions/v1/notify-partner');
```

Pour tester rapidement, désactivez la confirmation d'e-mail (Authentication → Providers → Email) ou confirmez les comptes depuis le tableau de bord.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm start` | Serveur de développement Expo |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint (config Expo) |
| `npm test` | Tests unitaires (calculs de grossesse, niveaux, quêtes, journal, textes des notifications, cohérence base ↔ traductions) |
| `npm run test:db` | Applique les migrations sur un Postgres de test et joue un scénario à deux utilisateurs (RLS, quêtes, XP, séries, badges, jetons push, droits, suppression de compte). Variable `DATABASE_URL` vers un Postgres ≥ 15 |
| `npm run gen:types` | Régénère `src/types/database.ts` depuis la base locale |

## Architecture

```
src/
  app/                 routes Expo Router
    (auth)/            inscription / connexion
    (onboarding)/      rôle → créer ou rejoindre un duo → dates de grossesse
    (tabs)/            Accueil, Quêtes, Journal, Équipe, Réglages
  components/          ui.tsx (primitives), duo.tsx (cartes métier), date-field (sélecteur natif / web), formulaire de dates
  hooks/               use-duo.ts (requêtes, mutations, synchro Realtime), use-names.ts, use-push.ts
  providers/           AuthProvider (session, profil, adhésion au duo)
  lib/                 pregnancy.ts, gamification.ts, journal.ts, describe.ts, supabase.ts, notifications.ts
  data/                repères de croissance par semaine, badges
  i18n/locales/fr/     common.json, quests.json, weeks.json
  types/               database.ts (généré), models.ts (alias)
supabase/
  migrations/          schéma, RLS, fonctions de jeu, Realtime, notifications
  functions/           Edge Function notify-partner (envoi des push Expo)
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

## Notifications

- **Push entre parents** : chaque événement du fil (quête terminée ou validée, humeur, rendez-vous, badge, encouragement…) déclenche, via un trigger `pg_net`, l'Edge Function `supabase/functions/notify-partner`, qui envoie une notification Expo à l'autre parent. Toucher la notification ouvre l'onglet concerné. Chacun peut couper ces alertes dans Réglages.
- **Rappel quotidien à 20 h** : notification locale programmée sur le téléphone (aucun serveur), activable dans Réglages.
- Le webhook ne transmet que l'identifiant de l'événement ; la fonction le relit et le marque comme envoyé (`pushed_at`) avant d'envoyer, ce qui empêche doublons et appels forgés.
- Les push distants **ne fonctionnent pas dans Expo Go sur Android** (limite d'Expo depuis le SDK 53) ni sur simulateur : il faut une version installée de l'app (voir ci-dessous). Le rappel local fonctionne partout sauf sur le web.

## Installer l'app sur vos téléphones (EAS)

Une seule fois, avec votre compte Expo :

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # crée le projet EAS et ajoute extra.eas.projectId dans app.json
```

Ajoutez ensuite `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_KEY` aux variables d'environnement du projet EAS (expo.dev → votre projet → Environment variables, ou `npx eas-cli@latest env:create`), pour les environnements development, preview et production.

Puis :

```bash
npx eas-cli@latest build --profile development --platform android   # ou ios
npx expo start --dev-client
```

Le profil `preview` produit une app autonome à partager (lien d'installation interne), `production` est destiné aux stores. Les identifiants de bundle sont `com.duogrossesse.app` (modifiables dans `app.json` avant le premier build). Sur iOS, l'installation interne demande un compte Apple Developer.

## Ajouter une langue

Créer `src/i18n/locales/<lng>/` avec les mêmes fichiers que `fr/`, puis l'ajouter à `resources` dans `src/i18n/index.ts`.

## Pistes suivantes

- Photos du ventre (Supabase Storage)
- Quêtes personnalisées créées par le couple
- Suppression de compte depuis l'app (la base le permet déjà : l'historique est conservé sans l'auteur)
