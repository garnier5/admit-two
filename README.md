# Admit Two — Nos plans à deux

PWA autonome (React 19 + TypeScript + Vite 8) qui reprend le fonctionnement du standalone
`standalone/Admit Two.html` :

- **Tickets** (`#/tickets`) : liste des idées de sorties, onglets *To do / Punched / All*, panneau de
  filtres (prix, durée, saison, lieu, catégories), poinçonnage animé du talon.
- **+ Issue** (`#/issue`) : nouveau ticket (destination, prix, durée, saisons, lieu, catégories
  personnalisables, « déjà poinçonné »).
- **Raffle** (`#/raffle`) : choix des critères, tirage animé, ticket gagnant à poinçonner.

Les données sont partagées en temps réel entre les membres, via le projet Supabase existant (celui
de Mealer) mais dans des tables à part, préfixées `admit_`.

## Mise en place

1. **Base** : exécuter `supabase/001_admit_init.sql` dans Supabase › SQL Editor. Si une ancienne
   version de ce script (option B) a déjà été exécutée, exécuter aussi
   `supabase/002_admit_option_a.sql`.
2. **Local** : `.env` (gitignoré) contient l'URL du projet et la clé **publishable**
   (`sb_publishable_…`), les mêmes que dans `Mealer-PWA/.env`. Lancer ensuite `npm install` et
   `npm run dev`.
3. **GitHub Pages** : dans le dépôt, *Settings › Pages › Source : GitHub Actions*, puis ajouter les
   secrets `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY`, avec les mêmes valeurs que ceux de Mealer.
   Chaque push sur `main` déploie l'app.

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run dev` | Serveur de dev (accessible sur le réseau local) |
| `npm run dev:offline` | Sans Supabase : données de démo stockées dans le navigateur, sans écran de connexion |
| `npm run build` | Vérification TypeScript, puis build de production dans `dist/` |
| `npm run preview` | Sert le build |
| `npm run icons` | Régénère les icônes depuis `public/icon.svg` (preset minimal2023) |

## Sécurité

- Le code et le dépôt ne contiennent que l'URL du projet et la clé publishable. L'app refuse de se
  connecter avec une clé qui ne commence pas par `sb_publishable_`, et le workflow échoue dans ce cas.
- **Accès (option A, comme Mealer)** : tous les comptes du projet, connectés et non anonymes.
  Toutes les règles RLS passent par `admit_is_member()`, qui appelle `public.is_member()` de Mealer
  sans la modifier.
- **Cohabitation avec Mealer** : les deux apps sont sur la même origine (`garnier5.github.io`).
  Admit Two garde donc sa session sous sa propre clé (`admit-two-auth`), se déconnecte en portée
  `local`, et « Reset this device » n'efface que ses propres données et caches.
- Pas de suppression définitive : il n'y a ni `grant delete` ni règle `delete`, seulement la colonne
  `deleted`. Les colonnes `created_*` et `updated_*` sont posées par trigger, et les droits
  `insert` et `update` sont limités colonne par colonne.
- Chaque modification d'un plan est archivée dans `admit_plans_history`, illisible depuis l'app.
- Les limites de taille et les valeurs autorisées sont vérifiées par des `check` SQL et appliquées
  côté app (`src/lib/model.ts`). Tout ce qui arrive du serveur est validé (`src/lib/validate.ts`)
  avant affichage.
- À la déconnexion, le cache local (`admit:*`) est effacé. En cas de plantage, un ErrorBoundary
  propose « Try again » et « Reset this device ».
