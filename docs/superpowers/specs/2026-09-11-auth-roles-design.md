# Lot 4.1 — Comptes et rôles : conception

Date : 2026-09-11 · Branche : `feat/lot4-auth-roles` · Périmètre : section 4.1 du sujet uniquement
(connexion, session, rafraîchissement, routes protégées, rôles). Le hors-ligne, la file de
mutations et la résolution des 409 (4.2+) sont hors périmètre et feront l'objet d'une conception
séparée.

## 1. Exigences (sujet, 4.1)

- Écran de connexion, session persistée, déconnexion.
- Rafraîchissement automatique du jeton d'accès (TTL 120 s) : jamais visible, jamais de
  déconnexion provoquée par l'expiration.
- Routes protégées : redirection vers la connexion, puis retour à l'écran demandé.
- Rôle `lecteur` : aucune action d'écriture visible (masquée, pas désactivée). Un 403 de l'API
  produit un message compréhensible.
- Jetons derrière `services/stockageSecurise.ts` : `expo-secure-store` sur mobile, repli documenté
  sur navigateur. Le jeton de rafraîchissement ne transite jamais par un état React et n'apparaît
  dans aucun journal.
- Intercepteur unique : injection, détection du 401, rafraîchissement, rejeu. Dix 401 simultanés
  ⇒ un seul rafraîchissement, les autres attendent.

## 2. Contrat API (api-books-v2, `../api`)

```
POST /auth/login    { email, motDePasse }
  200 → { accessToken, refreshToken, expiresIn, utilisateur: { id, email, role } }
  401 → { erreur: "identifiants_invalides" }
POST /auth/refresh  { refreshToken }
  200 → { accessToken, expiresIn }            (le refreshToken n'est PAS renouvelé)
  400 → { erreur: "refresh_absent" }
  401 → { erreur: "refresh_invalide" }
GET  /me            Authorization: Bearer <accessToken>
  200 → { id, email, role, authRequise }
```

Erreurs sur les routes protégées : 401 `jeton_absent | jeton_expire | jeton_invalide`,
403 `droits_insuffisants`. Rôles : `editeur` (lecture + écriture), `lecteur` (lecture seule).
`/auth/*` est épargné du mode chaos par défaut ; `/auth/login` fonctionne même avec
`AUTH_REQUIRED=false`.

## 3. Décisions

| Sujet | Décision | Pourquoi |
| --- | --- | --- |
| Porte de connexion | Toujours exigée, quel que soit `authRequise` | Déterministe ; `/auth/login` existe dans tous les modes du serveur |
| Repli navigateur | `localStorage` | La session doit survivre au rechargement sur la cible n°1 ; risque XSS documenté en ADR |
| Déclenchement du rafraîchissement | Réactif uniquement (sur 401 `jeton_expire`) | C'est exactement ce que la recette vérifie ; pas de minuteur, pas de dérive d'horloge |
| Emplacement de l'intercepteur | Couche `services/auth/intercepteur.ts` entre `send()` (`client.ts`) et `sendOnce()` (extrait dans `services/api/transport.ts` pour éviter un cycle d'import) | Un seul point ; `client.ts` reste sous 250 lignes ; réessai/délai inchangés |
| Garde de routes | Groupe `app/(app)/` avec `<Redirect>` dans son `_layout.tsx` | Motif documenté d'Expo Router ; le chemin demandé est conservé via `usePathname()` |
| Profil utilisateur au démarrage | Lu depuis `storage` (non secret), aucun appel réseau | Démarrage instantané, prépare le hors-ligne ; un rôle périmé est corrigé par le premier 403 |

## 4. Architecture

```
app/_layout.tsx ─ ErrorBoundary > ThemeProvider > QueryClientProvider > SessionProvider > Stack
                                                                                      ├─ connexion
                                                                                      └─ (app)/_layout ─ garde ─ Stack (index, books/…)

features/session/  SessionProvider, useSession, ConnexionForm
services/api/auth.ts       connexion(), profil()          ── request() avec auth:false
services/auth/intercepteur.ts  envoyerAuthentifie()       ── appelé par send() de client.ts
services/auth/jetons.ts        coffre : jetonAcces(), rafraichir() (vol unique), effacerJetons()
services/stockageSecurise.ts   expo-secure-store  |  .web.ts : localStorage
```

### 4.1 `services/stockageSecurise.ts` / `.web.ts`

Même contrat que `services/storage.ts` : `read(key)`, `write(key, value)`, `remove(key)`, toute
défaillance avalée et rapportée comme absence. Natif : `expo-secure-store`
(`getItemAsync` / `setItemAsync` / `deleteItemAsync`, vérifié sur la doc v54). Web : `localStorage`
via un accesseur protégé, clés `booklist.jeton.*`. Le repli et son risque sont consignés
en ADR 006.

### 4.2 `services/auth/jetons.ts` — coffre à jetons

- État privé au module : `accesEnMemoire: string | null`, `rafraichissementEnCours: Promise<string> | null`.
- `chargerJetons(): Promise<boolean>` — lit l'accès depuis le stockage sécurisé vers la mémoire ;
  renvoie `true` si un jeton de rafraîchissement existe.
- `enregistrerJetons({ accessToken, refreshToken })` — écrit les deux dans le stockage sécurisé,
  met l'accès en mémoire.
- `jetonAcces(): string | null` — synchrone.
- `rafraichir(): Promise<string>` — **vol unique** : si une promesse est en cours, la renvoie ;
  sinon lit le jeton de rafraîchissement dans le stockage sécurisé, `POST /auth/refresh`,
  enregistre le nouvel accès, résout. `finally` remet la promesse à `null`.
  - 400/401 (`refresh_absent`, `refresh_invalide`) → `effacerJetons()`, émet `sessionPerdue`,
    rejette avec `ApiError { kind: "auth", code: "jeton_invalide" }`.
  - Réseau / 503 → rejette avec l'erreur réseau, **jetons conservés**.
- `effacerJetons()` — supprime les deux clés et la mémoire.
- `surSessionPerdue(cb): () => void` — abonnement (émetteur minimal, pas de dépendance).
- **Aucun accesseur du jeton de rafraîchissement n'est exporté.** Il n'apparaît dans aucune
  valeur de retour, aucun `Error.message`, aucun `cause`.

### 4.3 `services/auth/intercepteur.ts`

```ts
envoyerAuthentifie(url, options, envoyer: typeof sendOnce): Promise<Response>
```

1. Si `options.auth !== false` et `jetonAcces()` présent : ajoute `Authorization: Bearer …`.
2. Envoie. Si statut ≠ 401 → renvoie.
3. Lit `erreur` sur un **clone** de la réponse. Si ≠ `jeton_expire` → renvoie la réponse telle
   quelle (deviendra `AuthError` via `toApiError`).
4. `await rafraichir()` (partagé par tous les appelants simultanés), puis **un seul** rejeu avec le
   nouveau jeton. La réponse du rejeu est renvoyée sans nouvelle interception.

`client.ts` : `send()` appelle `envoyerAuthentifie(url, options, sendOnce)` à la place de
`sendOnce`. `RequestOptions` gagne `auth?: boolean`. Le réessai sur 503 et le délai d'expiration
restent dans `send()`/`sendOnce()`, inchangés.

### 4.4 `services/api/auth.ts` et `domain/utilisateur.ts`

- `domain/utilisateur.ts` : `RoleSchema = z.enum(["editeur", "lecteur"])`,
  `UtilisateurSchema = { id, email, role }`, type `Utilisateur`, `peutEcrire(role)`.
- `services/api/auth.ts` :
  - `connexion(email, motDePasse): Promise<Utilisateur>` — `POST /auth/login` avec `auth: false`,
    schéma `{ accessToken, refreshToken, expiresIn, utilisateur }` ; appelle `enregistrerJetons`
    ; **ne renvoie que `utilisateur`**.
  - `profil(): Promise<Utilisateur>` — `GET /me` (disponible pour vérification, non appelé au
    démarrage).
- `toApiError` : 401 `identifiants_invalides` doit être conservé comme code → `AUTH_CODES`
  s'étend de `identifiants_invalides`, `refresh_invalide`.

### 4.5 `features/session/`

- `SessionProvider` : état `{ statut: "chargement" | "anonyme" | "connecte"; utilisateur?: Utilisateur; raison?: "expiree" }`.
  - Démarrage : `chargerJetons()` + lecture de `utilisateur` (clé `booklist.session.utilisateur`,
    stockage ordinaire, zod-validé). Les deux présents → `connecte`, sinon `anonyme`. Aucun réseau.
  - `connexion(email, motDePasse)` → `services/api/auth.connexion`, persiste `utilisateur`,
    statut `connecte`.
  - `deconnexion()` → `effacerJetons()`, supprime `utilisateur`, `queryClient.clear()`,
    statut `anonyme`.
  - Abonné à `sessionPerdue` → même chose que `deconnexion()` avec `raison: "expiree"`.
- `useSession()` → `{ statut, utilisateur, peutEcrire, raison, connexion, deconnexion }`.
  `peutEcrire = utilisateur?.role === "editeur"`.

### 4.6 Routage

- `app/index.tsx`, `app/books/**` déplacés vers `app/(app)/…` — URL inchangées.
- `app/_layout.tsx` : ajoute `SessionProvider` ; la `Stack` racine déclare `connexion`
  (`headerShown: false`) et `(app)`.
- `app/(app)/_layout.tsx` :
  - `chargement` → écran squelette (jamais blanc) ;
  - `anonyme` → `<Redirect href={{ pathname: "/connexion", params: { retour: pathname } }} />` ;
  - `connecte` → `Stack` avec les options d'en-tête actuelles + `headerRight` = `CompteMenu` + `ThemeMenu`.
- `app/connexion.tsx` : si `connecte` → `<Redirect href={retourSur(params.retour)} />` ; sinon
  `ConnexionForm`. `retourSur()` (dans `domain/session.ts`, pur) n'accepte qu'un chemin
  commençant par `/`, pas `//`, pas `/connexion` ; sinon `/`.
- `app/(app)/books/new.tsx` et `[id]/edit.tsx` : si `!peutEcrire` → `<Redirect href="/" />`
  (garde les liens profonds).

### 4.7 Écran de connexion — `features/session/ConnexionForm.tsx`

- react-hook-form + zod (`email` valide, `motDePasse` non vide). Bouton désactivé pendant
  l'envoi ; pas de double soumission.
- 401 `identifiants_invalides` → message inline « Email ou mot de passe incorrect. » ;
  réseau/503 → `ErrorState banner` avec réessai ; `raison === "expiree"` → `Notice`
  « Votre session a expiré. Reconnectez-vous. »
- Succès → `router.replace(retourSur(retour))`.

### 4.8 Menu de compte — `components/ui/CompteMenu.tsx`

Icône `account` dans l'en-tête, à côté de `ThemeMenu`. Affiche l'email et le libellé du rôle
(« Libraire titulaire » / « Lecture seule »), entrée « Se déconnecter ». Même motif que
`DeferredMenu`.

### 4.9 Rôles — masquer, pas désactiver

Source unique : `useSession().peutEcrire`, transmis en prop aux composants purs (testables sans
fournisseur). Quand `false`, l'élément **n'est pas rendu** :

| Écran / composant | Élément masqué |
| --- | --- |
| `(app)/index` | Bouton d'en-tête « Ajouter » |
| `BookListEmpty` | Action « Ajouter » (`onCreate` devient optionnel) |
| `BookRow` | Bouton coup de cœur → icône statique (`readOnly`) |
| `BookDetail` / `ToggleControl` / `FavouriteButton` | Bascules → texte de lecture (`readOnly`) |
| `BookRecord` | « Modifier la fiche », « Supprimer » |
| `NoteSection` | `NoteComposer` ; suppression dans `NoteRow` |

### 4.10 Messages — `features/errors/messages.ts`, cas `auth`

- `droits_insuffisants` → titre « Action réservée aux libraires titulaires », détail « Votre
  compte est en lecture seule. Demandez à un titulaire d'effectuer cette modification. »,
  non réessayable.
- `identifiants_invalides` → « Email ou mot de passe incorrect. »
- Autres codes → « Votre session n'est plus valide. Reconnectez-vous. »

Les bascules optimistes existantes reviennent en arrière sur erreur : un 403 s'affiche donc dans
la `Notice` existante avec ce message.

## 5. Flux d'erreur

| Événement | Effet |
| --- | --- |
| 401 `jeton_expire` sur N requêtes simultanées | 1 `POST /auth/refresh`, N rejeux, aucun signal visible |
| Rejeu répond encore 401 | Pas de boucle : `AuthError` remonte à l'appelant |
| `/auth/refresh` → 401 `refresh_invalide` | Jetons effacés, `sessionPerdue`, redirection vers `/connexion` avec `raison=expiree` |
| `/auth/refresh` → réseau / 503 | Erreur réseau à l'appelant, jetons conservés, réessai standard de `send()` |
| 403 `droits_insuffisants` | Message §4.10, retour arrière de l'écriture optimiste |
| Démarrage sans jetons | `anonyme` → connexion |

## 6. Tests

- `services/__tests__/stockageSecurise.test.ts` — contrat, défaillances avalées (web).
- `services/auth/__tests__/jetons.test.ts` — vol unique (10 `rafraichir()` simultanés → 1 fetch) ;
  `refresh_invalide` efface et émet ; 503 conserve ; aucune valeur exportée ne contient le jeton
  de rafraîchissement.
- `services/auth/__tests__/intercepteur.test.ts` — en-tête injecté ; `auth:false` l'omet ; 401
  `jeton_expire` → rafraîchissement → rejeu avec le nouveau jeton ; **10 requêtes 401 simultanées
  → exactement 1 `POST /auth/refresh`, 10 rejeux** ; second 401 non rejoué ; 401 autre code non
  intercepté.
- `features/session/__tests__/SessionProvider.test.tsx` — états au démarrage, `peutEcrire`,
  `deconnexion` vide jetons + cache, `sessionPerdue` → `raison: "expiree"`.
- `components/__tests__/ConnexionForm.test.tsx` — validation, identifiants refusés, double
  soumission bloquée.
- Composants `readOnly` — `BookRow`, `BookDetail`, `NoteSection` : contrôles d'écriture absents
  (`queryByRole` → `null`).
- `e2e/auth.spec.ts` — (a) `/books/l-1` anonyme → connexion → retour sur `/books/l-1` ;
  (b) session `lecteur` → aucun « Ajouter », « Modifier », composeur de note ; (c) 401
  `jeton_expire` simulé en cours de session → liste toujours affichée, un seul appel
  `/auth/refresh`, aucune redirection.

## 7. Documentation

- ADR 006 — stockage des jetons (secure-store / localStorage), politique de rafraîchissement
  réactive à vol unique, choix « connexion toujours exigée ».
- README — lancer `npm run auth`, comptes de démonstration, parcours de recette.

## 8. Contraintes de qualité

Tout fichier < 250 lignes (`client.ts` +≈10, `BookRecord.tsx` +≈10) ; aucun `any`, aucun
`console.*`, aucun `catch` vide non commenté ; aucun secret dans le dépôt ; tout réseau dans
`services/`.
