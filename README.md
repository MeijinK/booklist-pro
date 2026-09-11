# BookList Pro

[![CI](https://github.com/MeijinK/booklist-pro/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/MeijinK/booklist-pro/actions/workflows/ci.yml)

Carnet de lecture pour libraires — application [Expo](https://docs.expo.dev/versions/v54.0.0/) / React Native,
interface [React Native Paper](https://callstack.github.io/react-native-paper/) thémée aux jetons du projet.
**Cible n°1 : le navigateur** (aucun émulateur requis) ; iOS et Android tournent sur la même base.

## Démarrer (< 5 min)

Prérequis : **Node 24** (`.nvmrc`, `nvm use`) et npm 11. La CI utilise la même version ;
installer avec une autre majeure de npm régénère `package-lock.json` différemment et
casse `npm ci` en intégration continue.

```bash
nvm use            # lit .nvmrc
npm install
npm run web        # ouvre l'app sur http://localhost:8081
```

L'API de démonstration vit dans `api-books-v2/` (fournie, non modifiable) :

```bash
cd api-books-v2 && npm install
npm run seed       # 500 ouvrages et les deux comptes ci-dessous
npm run auth       # rôles et jetons : le mode à utiliser depuis le lot 4
npm run chaos      # 1,5 s de latence + 30 % d'échecs
npm run final      # conditions de recette
```

L'application demande toujours une connexion, quel que soit le mode du serveur. Comptes créés par le seed :

| Email | Mot de passe | Rôle |
| --- | --- | --- |
| `editeur@booklist.fr` | `editeur123` | Libraire titulaire — lecture et écriture |
| `lecteur@booklist.fr` | `lecteur123` | Lecture seule — aucune action d'écriture affichée |

Parcours de recette du lot 4.1 :

1. Ouvrir `http://localhost:8081/books/new` sans session : l'écran de connexion s'affiche, puis renvoie sur le formulaire une fois connecté.
2. Laisser l'application ouverte plus de deux minutes, puis cliquer sur un cœur : aucun écran de connexion, un seul `POST /auth/refresh` dans l'onglet Réseau, la requête rejouée.
3. Recharger la page : la session est conservée.
4. Se déconnecter (menu du compte, en haut à droite), se connecter en `lecteur` : ni « Ajouter », ni cœur, ni composeur de note, ni « Modifier » / « Supprimer » ; `/books/new` renvoie sur le fonds.

### Recette hors ligne (lot 4.6)

Conditions de l'évaluation : `npm run final` côté API (auth + chaos). L'indicateur en haut à
droite dit en permanence où en est le poste : *En ligne*, *Hors ligne*, *N modifications en
attente* (toucher = synchroniser), *N conflits à traiter* (rouge, toucher = les traiter).

1. Se connecter en `editeur@booklist.fr`. Ouvrir le fonds, puis DevTools → Réseau → **Offline**.
2. « Ajouter » : créer un ouvrage. Il apparaît en tête de liste, l'indicateur passe à *1 modification en attente*.
3. Ouvrir « Ouvrage X », « Modifier la fiche », changer le titre, « Enregistrer ». *2 modifications en attente*.
4. Pendant ce temps, côté serveur, modifier le même ouvrage (le jeton s'obtient par `POST /auth/login`) :

   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" \
     -d '{"email":"editeur@booklist.fr","motDePasse":"editeur123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
   curl -X PATCH http://localhost:3000/books/<ID> -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" -d '{"titre":"Modifié par le serveur"}'
   ```

5. Attendre plus de 120 secondes : le jeton d'accès de l'application a expiré.
6. Repasser **Online**. Dans l'onglet Réseau : `POST /sync` → 401, `POST /auth/refresh`, `POST /sync` rejoué avec les mêmes `id`.

Attendu : l'ouvrage créé n'existe qu'une fois (le second lot répond `rejeu: true`), l'indicateur
passe à *1 conflit à traiter*, l'écran de fusion montre *Votre version* / *Version serveur*
champ par champ, « Appliquer la fusion » renvoie un `update` avec `baseVersion` = version
serveur, et rien n'a été perdu. Recharger la page en cours de route ne change rien : file,
conflits et brouillons sont sur disque.

Le tableau de bord (icône graphique dans l'en-tête, ou menu du compte) reste consultable hors
ligne avec la date de dernière mise à jour.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run web` | Lance l'app dans le navigateur (cible principale) |
| `npm run lint` | ESLint (config Expo) |
| `npm run typecheck` | `tsc --noEmit`, TypeScript `strict` |
| `npm test` | Tests unitaires et composants (Jest + Testing Library) |
| `npm run test:coverage` | Idem avec rapport de couverture |
| `npm run build:web` | Export web statique dans `dist/` |
| `npm run test:e2e` | Tests de bout en bout Playwright sur l'export web |

Avant le premier `npm run test:e2e` :

```bash
npm run build:web
npx playwright install chromium
```

Playwright sert `dist/` sur le port **8082** tout seul (`webServer` dans `playwright.config.ts`) :
le 8081 reste libre pour `npx expo start --web`, les deux peuvent donc tourner ensemble.

## Tests

- **Domaine et services** — `domain/__tests__/`, `services/__tests__/` : règles métier pures et résolution des couvertures, sans réseau.
- **Composants** — `components/__tests__/`, preset `jest-expo`, requêtes par rôle et par texte (jamais par structure DOM).
- **Hooks de données** — `features/books/__tests__/`, `features/notes/__tests__/` : `fetch` simulé, pagination, écritures optimistes et retours arrière.
- **Hooks génériques** — `hooks/__tests__/`, minuteurs simulés pour l'anti-rebond de la recherche.
- **Session et jetons** — `services/auth/__tests__/`, `features/session/__tests__/` : coffre à jetons, rafraîchissement à vol unique (dix 401 simultanés, un seul `POST /auth/refresh`), rejeu, session perdue.
- **Bout en bout** — `e2e/`, les parcours critiques dans un vrai navigateur sur le bundle réellement livré (`support/api.ts` porte les mocks partagés).

## Intégration continue

`.github/workflows/ci.yml` s'exécute sur chaque pull request vers `main` et sur `main`, en quatre jobs parallèles :

| Job | Commande |
| --- | --- |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Tests unitaires | `npm run test:coverage` |
| Tests e2e | `npm run build:web` puis `npm run test:e2e` |

Les rapports de couverture et Playwright sont publiés en artefacts du run (7 jours).

## Documentation

- `PRODUCT.md` — utilisateurs, scène d'usage, principes et anti-références
- `AGENTS.md` — règles d'architecture et contrat de qualité
- `docs/ADR/` — décisions d'architecture, dont l'ADR 005 sur les écritures optimistes, l'ADR 006 sur la session et les jetons, l'ADR 007 sur le mode hors ligne et la file de mutations, l'ADR 008 sur la fusion assistée des conflits
- `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, `IA.md`
