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
npm start          # lots 1-3, sans auth
npm run auth       # lot 4 : rôles et jetons
npm run chaos      # 1,5 s de latence + 30 % d'échecs
npm run final      # conditions de recette
```

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
- **Hooks de données** — `features/livres/__tests__/`, `fetch` simulé, pagination et erreurs discriminées.
- **Bout en bout** — `e2e/`, un parcours critique dans un vrai navigateur sur le bundle réellement livré.

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
- `docs/ADR/`, `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`, `IA.md`
