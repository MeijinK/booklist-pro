# Lot 4.2 → 4.6 — Hors ligne, file de mutations, conflits, tableau de bord : conception

Date : 2026-09-11 · Branche : `feat/lot4-offline-sync` · Base : `main` (lot 4.1 mergé) ·
Périmètre : sections 4.2 (mode hors ligne), 4.3 (résolution des conflits), 4.4 (tableau de
bord), 4.5 (exigences techniques), 4.6 (scénario de recette) du sujet.

## 1. Exigences (sujet)

**4.2 Mode hors ligne**

- Cache local persistant : au démarrage, données connues affichées immédiatement, revalidation en
  arrière-plan. Un libraire en réserve voit son fonds.
- File de mutations : hors ligne, ajout / modification / suppression d'un ouvrage et rédaction
  d'une note restent possibles. Mutations persistées (survivent à un rechargement), horodatées,
  rejouées dans l'ordre au retour du réseau via `POST /sync`.
- Indicateur de synchronisation visible en permanence : en ligne · hors ligne · N modifications en
  attente · conflit à traiter.
- Aucune perte de saisie : couper le réseau au milieu d'une note n'efface rien.
- Cas limite explicite : le jeton expire pendant la synchronisation d'un lot.

**4.3 Conflits** — stratégie choisie consciemment, implémentée, documentée en ADR, compréhensible
par un libraire. Choix : **fusion assistée** (écran de comparaison champ par champ).

**4.4 Tableau de bord** — `GET /stats`, au moins deux graphiques (lus / non lus ; distribution des
notes ou par année), consultable hors ligne depuis le cache avec date de dernière mise à jour.

**4.5 Technique** — la fonction qui décide du sort d'une mutation face à une réponse serveur est
pure, sans effet de bord, testée unitairement, cas de conflit compris. Idempotence : une mutation
rejouée deux fois ne crée pas deux ouvrages.

**4.6 Recette** — connexion éditeur → hors ligne → créer un ouvrage → modifier un ouvrage existant
→ le serveur modifie le même ouvrage (curl) → attendre 120 s → rétablir le réseau. Attendu : jeton
rafraîchi silencieusement, ouvrage créé une seule fois, conflit détecté, stratégie appliquée,
libraire informé, rien de perdu.

## 2. Contrat API (`../api`)

```
POST /sync   { mutations: [
  { id, type: "create", livre: { titre, auteur, editeur, annee, lu } },
  { id, type: "update", baseVersion?: n, livre: { id, ...champs partiels } },
  { id, type: "delete", livreId, baseVersion?: n } ] }
200 → { resultats: [
  { id, statut: "ok", livre, rejeu?: true },
  { id, statut: "conflit", serveur: Livre, versionAttendue: n },
  { id, statut: "erreur", message?: string, champs?: {…} } ],
  resume: { total, ok, conflits, erreurs }, serveurLe }
413 → lot > 200 mutations   ·   422 → `mutations` absent
```

Règles serveur : ordre reçu ; un conflit n'interrompt pas le lot ; **idempotence par `id` de
mutation** (résultat mémorisé renvoyé avec `rejeu: true`) ; `update` est partiel (mêmes règles que
PATCH) ; `baseVersion` absent ⇒ pas de contrôle de version ; supprimer un livre absent ⇒ `ok`.
Route réservée au rôle `editeur` (403 sinon).

**Les notes ne passent pas par `/sync`** : `POST /books/:id/notes { contenu }` uniquement, sans
identifiant client. `GET /stats` → `{ total, lus, nonLus, favoris, moyenneNotes, totalNotes,
distributionNotes: [{ note, total }], parAnnee: [{ annee, total }], parAuteur: [{ auteur, total }],
genereLe }`.

Rafraîchissement du jeton : déjà pris en charge par `services/auth/intercepteur.ts` (401
`jeton_expire` → `rafraichir()` à vol unique → un rejeu). Perte de session → `surSessionPerdue`.

## 3. Décisions

| Sujet | Décision | Pourquoi |
|---|---|---|
| Chemin d'écriture | **Un seul** : chaque écriture est mise en file puis synchronisée, en ligne comme hors ligne | Un seul code à tester ; l'idempotence vaut aussi pour un 503 du mode chaos ; pas de « mode » à basculer |
| File | Store maison persisté (`services/storage`), pas les mutations en pause de TanStack | Lot `/sync` groupé, fusion des mutations, ids stables, fonction de décision pure — TanStack rejoue requête par requête |
| Détection réseau | `services/reseau.ts` sans dépendance : `navigator.onLine` + événements sur le web ; natif : supposé en ligne. Toute erreur `network` sans statut bascule « hors ligne », le prochain succès rebascule | Cible n°1 = navigateur ; Playwright `setOffline` pilote exactement ce signal ; un 503 n'est *pas* hors ligne |
| Cache | `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` sur `services/storage` | Standard, même éditeur que la lib déjà en place ; hydratation avant le premier rendu |
| Conflits | Fusion assistée, écran champ par champ | La plus valorisée ; le libraire arbitre, rien n'est écarté sans lui |
| Graphiques | `View` + pourcentages, pas de lib | Rendu identique Jest / web / natif, accessible, zéro dépendance |
| Identifiants | `crypto.randomUUID()` (web, Hermes) avec repli `Math.random` | Pas d'`expo-crypto` pour un besoin couvert nativement |

## 4. Architecture

```
services/reseau.ts / reseau.web.ts      estEnLigne(), signalerPanne(), signalerSucces(), surChangement()
services/cachePersistant.ts             persister + options (maxAge 7 j, buster = version app,
                                        exclusion des requêtes d'enrichissement)
services/api/sync.ts                    envoyerLot(mutations) → POST /sync typé zod
services/api/stats.ts                   lireStats() → GET /stats typé zod
services/sync/
  mutation.ts      types MutationLocale, nouvelId(), fusionnerFile(file, m)  [pur]
  decision.ts      decider(m, resultat) → Decision                          [pur]
  fusion.ts        champsEnConflit(local, serveur), fusionner(local, serveur, choix) [pur]
  file.ts          store persisté : lire(), ajouter(), retirer(), remplacer(), surChangement()
  conflits.ts      store persisté des conflits en attente d'arbitrage
  alias.ts         table local:id → id serveur, persistée ; resoudreId()
  synchroniser.ts  orchestration à vol unique
domain/sync.ts     schémas zod des mutations, résultats, conflits
domain/stats.ts    StatsSchema
features/sync/     useSync(), useConflits(), IndicateurSync, EcranConflits, EcranFusion
features/stats/    useStats(), TableauDeBord
components/stats/  BarreEmpilee, Histogramme
app/(app)/conflits/index.tsx, conflits/[id].tsx, stats.tsx
```

### 4.1 Modèle de mutation (`domain/sync.ts`)

```ts
type MutationLocale =
  | { id: string; type: "create"; creeLe: string; livreId: string /* local:<uuid> */; livre: BookDraft }
  | { id: string; type: "update"; creeLe: string; livreId: string; baseVersion?: number; champs: BookPatch }
  | { id: string; type: "delete"; creeLe: string; livreId: string; baseVersion?: number }
  | { id: string; type: "note";   creeLe: string; livreId: string; contenu: string };
```

- `id` : généré **une fois** à la mise en file, jamais régénéré. C'est lui que le serveur mémorise.
- `creeLe` : ISO, ordre de rejeu.
- `livreId` commençant par `local:` = ouvrage créé hors ligne, pas encore connu du serveur.
- Le PUT `If-Match` du formulaire d'édition (lot 1) disparaît : le formulaire produit un `update`
  avec `champs` = le brouillon complet et `baseVersion` = version lue. Le basculement `lu` /
  `favori` produit un `update` **sans** `baseVersion` (intention qu'aucune correction de titre ne
  contredit — règle déjà posée dans `useToggleBook`).

### 4.2 Fusion de la file — `fusionnerFile(file, nouvelle)` (pur)

Appliquée à chaque ajout, sur le même `livreId` :

| Existante | Nouvelle | Résultat |
|---|---|---|
| `update` | `update` | une seule `update` : `champs` fusionnés (la nouvelle écrase), `baseVersion` = première définie |
| `create` (local) | `update` | `create` avec `livre` mis à jour |
| `create` (local) | `delete` | les deux disparaissent, ainsi que les `note` du même `livreId` |
| `update` | `delete` | `delete` seule (avec la `baseVersion` de l'update si elle existait) |
| `delete` | `update` | impossible côté UI (fiche disparue) ; conservé tel quel |
| — | `note` | toujours ajoutée, jamais fusionnée |

L'`id` de la mutation survivante est conservé (celui de l'existante). Une mutation partie dans un
lot en cours n'est pas fusionnable : `synchroniser` prend un **instantané** de la file, et
`fusionnerFile` ne touche pas aux ids de cet instantané (drapeau `enVol` en mémoire, pas persisté).

### 4.3 Décision — `decider(m, r)` (pur, `services/sync/decision.ts`)

```ts
type Decision =
  | { action: "retirer"; livre: Book | null; alias?: { local: string; serveur: string } }
  | { action: "conflit"; conflit: Conflit }
  | { action: "rejeter"; motif: string; champs?: Record<string, string> }
  | { action: "garder" };
```

| Réponse | Décision |
|---|---|
| `ok` (avec ou sans `rejeu`) | `retirer` ; si `m.type === "create"` → `alias { local: m.livreId, serveur: r.livre.id }` |
| `conflit` | `conflit` ({ id, mutation: m, serveur: r.serveur, versionAttendue, detecteLe }) |
| `erreur` avec `champs` (422) | `rejeter` (motif « refusé par le serveur », champs) |
| `erreur` « livre introuvable » | `rejeter` (motif « supprimé côté serveur ») |
| `erreur` autre / résultat absent | `garder` |

`decider` ne lit ni le store, ni le cache, ni l'horloge (`detecteLe` passé en paramètre). Tests :
chaque ligne, `rejeu: true`, conflit sur `delete`, résultat manquant.

### 4.4 Orchestration — `synchroniser()` (`services/sync/synchroniser.ts`)

Déclencheurs : démarrage (session `connecte` et file non vide), passage en ligne, ajout d'une
mutation alors qu'on est en ligne, bouton « Synchroniser » de l'indicateur. **Vol unique** : un
appel pendant une synchronisation renvoie la promesse en cours. Ignoré si `anonyme` ou `lecteur`
(la file ne peut contenir que des écritures d'un éditeur).

1. Instantané des mutations `create|update|delete`, triées par `creeLe`, découpées en lots de 200.
2. Pour chaque lot : `envoyerLot(lot)` via `client.ts` (donc via l'intercepteur). Un 401
   `jeton_expire` en plein lot ⇒ rafraîchissement, rejeu du **même** corps avec les **mêmes** ids ⇒
   le serveur répond `rejeu: true` pour ce qu'il avait déjà appliqué. **C'est la réponse au cas
   limite 4.2.** Si le rafraîchissement échoue, `surSessionPerdue` déconnecte ; la file reste sur
   disque, intacte ; l'indicateur affiche « N en attente — reconnectez-vous » ; la prochaine
   connexion relance la synchronisation.
3. Erreur transport / 503 sur le lot entier ⇒ `signalerPanne()` si erreur réseau, toutes les
   mutations `garder`. `client.ts` ne rejoue pas les POST : **la file est le mécanisme de rejeu**.
   Pas de boucle immédiate — nouvelle tentative au prochain déclencheur, avec un délai croissant
   (1 s, 2 s, 4 s… plafonné à 30 s, réinitialisé au premier succès) après un 503 pour ne pas
   aggraver une panne.
4. Pour chaque résultat, `decider` puis application :
   - `retirer` → retrait de la file ; `livre` écrit dans le cache (`bookKeys.detail`, listes) ;
     `alias` enregistré, `livreId` réécrit dans les mutations restantes (notes comprises) et dans
     les conflits ; entrée de cache `local:` recopiée sous l'id réel.
   - `conflit` → retrait de la file, ajout dans `conflits`.
   - `rejeter` → retrait de la file, ajout dans `conflits` avec `type: "rejet"` (la saisie du
     libraire reste consultable et recopiable : rien n'est perdu silencieusement).
5. Notes : pour chaque `note` dont le `livreId` est réel, `GET /books/:id/notes` puis
   `POST` seulement si aucune note existante n'a le même `contenu` (déduplication après réponse
   perdue) ; `ok` ⇒ retrait, cache mis à jour ; erreur réseau ⇒ `garder` ; 404 livre ⇒ `rejet`.
6. `invalidateQueries(bookKeys.all)` et `statsKeys.all` ; `signalerSucces()`.

État exposé (`useSync()`) : `{ enLigne, enAttente: number, enCours: boolean, conflits: number,
derniereSync?: string, synchroniser() }`.

### 4.5 Cache persistant

- `app/_layout.tsx` : `PersistQueryClientProvider` avec `createAsyncStoragePersister({ storage,
  key: "booklist.cache", throttleTime: 1000 })`, `maxAge` 7 jours, `buster` = version d'`app.json`,
  `dehydrateOptions.shouldDehydrateQuery` exclut `enrichmentKeys.all`.
- `createQueryClient` : `gcTime` 7 jours (sinon les entrées sont purgées avant d'être persistées).
- Hors ligne, une requête dont le cache existe garde ses données (`data` conservé, `error` posé) :
  `BookList`, `BookRecord`, `NoteSection`, `TableauDeBord` affichent les données avec une `Notice`
  « Hors ligne — données du cache » et ne montrent l'écran d'erreur que sans données. Une requête
  jamais chargée (filtre inédit) affiche l'écran d'erreur actuel avec un message hors ligne.
- Déconnexion : `queryClient.clear()` + `persister.removeClient()` (déjà `clear()` aujourd'hui).
  La **file** et les **conflits** ne sont *pas* effacés à la déconnexion : ils appartiennent au
  poste, et une session expirée en plein lot ne doit rien perdre. Une déconnexion volontaire avec
  N mutations en attente affiche une confirmation.

### 4.6 Écriture optimiste

À la mise en file, le cache reflète l'intention immédiatement (même logique que `writeBook` dans
`useToggleBook`, extraite dans `services/sync/cache.ts`) :

- `create` → `Book` local `{ id: "local:…", version: 0, createdAt/updatedAt = maintenant, note:
  null, favori: false, couverture: null }` inséré en tête de chaque page de liste en cache et en
  `bookKeys.detail`.
- `update` → champs appliqués sur le détail et les listes.
- `delete` → retiré des listes (après le délai d'annulation de 5 s, inchangé).
- `note` → insérée en tête de `noteKeys.all(livreId)` avec un id `local:` (déjà le cas).

`useBook(id)` et `useNotes(id)` passent par `resoudreId(id)` : une fiche ouverte sur `local:x`
continue de fonctionner après l'attribution de l'id réel.

### 4.7 Conflits — fusion assistée

`Conflit = { id, type: "conflit" | "rejet", mutation: MutationLocale, serveur?: Book,
versionAttendue?: number, motif?: string, champs?: Record<string,string>, detecteLe }`, persisté
sous `booklist.conflits`.

`champsEnConflit(mutation, serveur)` (pur) : liste `{ champ, locale, serveur, differe }` pour
`titre, auteur, editeur, annee, lu, favori` présents dans `champs`. `fusionner(mutation, serveur,
choix: Record<champ, "locale" | "serveur">)` (pur) → `BookPatch` des champs où le libraire garde sa
version. Pré-sélection : « ma version » pour les champs modifiés localement et différents, rien à
choisir pour les autres.

Écrans :

- `conflits/index.tsx` : liste (titre serveur ou local, date, type). Accessible depuis
  l'indicateur.
- `conflits/[id].tsx` : titre « Cette fiche a été modifiée par un collègue », deux colonnes *Votre
  version* / *Version serveur* par champ, `RadioButton` par ligne, aperçu du résultat, boutons
  **Appliquer la fusion** (met en file un `update` avec `baseVersion = versionAttendue` et le
  patch fusionné, retire le conflit, lance `synchroniser`) et **Garder la version serveur** (retire
  le conflit, invalide la fiche). Conflit sur `delete` : « Ce livre a été modifié depuis. Le
  supprimer quand même ? » → **Supprimer quand même** (`delete` avec `baseVersion =
  versionAttendue`) / **Conserver**. Rejet (422 / introuvable) : la saisie affichée, bouton
  **Recopier** (ouvre le formulaire de création prérempli) / **Abandonner**.

Un conflit en attente ne bloque pas les autres mutations : la file continue de se synchroniser.

### 4.8 Indicateur (`features/sync/IndicateurSync.tsx`)

Dans `HeaderActions`, avant le menu compte, toujours rendu pour une session connectée :

| État | Rendu | Action au toucher |
|---|---|---|
| en ligne, rien en attente | icône `cloud-check-outline`, libellé accessible « En ligne, tout est synchronisé » | — |
| hors ligne | `cloud-off-outline` + « Hors ligne » (texte visible) | — |
| N en attente | `cloud-upload-outline` + badge N ; libellé « N modification(s) en attente » | `synchroniser()` |
| en cours | `ActivityIndicator` + « Synchronisation… » | — |
| conflit(s) | `alert-circle` couleur `danger` + badge ; libellé « N conflit(s) à traiter » | → `/conflits` |

Le conflit prime sur l'attente, l'attente prime sur le simple état réseau. Composant pur
`IndicateurSync(props)` + `IndicateurSyncConnecte` branché sur `useSync()`.

### 4.9 Aucune perte de saisie

- La mise en file ne peut pas échouer (écriture locale) : le composeur de note et le formulaire ne
  connaissent plus d'erreur réseau, seulement les erreurs de validation locales.
- Brouillons persistés : `useBrouillon(cle)` (`features/sync/useBrouillon.ts`) écrit le texte dans
  `storage` (clé `booklist.brouillon.<cle>`) avec un délai de 300 ms, le restaure au montage,
  l'efface à l'envoi. Utilisé par `NoteComposer` (clé = `note:<livreId>`) et le formulaire
  (`livre:new`, `livre:<id>`). Un rechargement de page en pleine note retrouve le texte.

### 4.10 Tableau de bord (`app/(app)/stats.tsx`)

- `useStats()` : `useQuery({ queryKey: statsKeys.all, queryFn: lireStats })`, `dataUpdatedAt`
  affiché « Mis à jour le 11/09/2026 à 14:03 » (locale `fr-FR`). Hors ligne avec cache : données
  + `Notice` « Hors ligne — chiffres du … ». Sans cache : écran d'erreur avec réessai.
- `BarreEmpilee({ segments: [{ libelle, valeur, couleur }] })` : une barre horizontale, largeurs en
  `%` de la somme, légende avec valeurs ; libellé accessible « Lus : 320 sur 500 (64 %) ».
- `Histogramme({ barres: [{ libelle, valeur }], titre })` : barres verticales, hauteur en `%` du
  max, valeur au-dessus. Utilisé pour `distributionNotes` (0 à 5, « Sans note » = total −
  somme) et `parAnnee` (12 dernières années présentes, triées).
- Chiffres clés en tête : total, favoris, moyenne des notes, nombre de notes.
- Entrée : élément « Tableau de bord » dans le menu compte + icône dans le header de la liste.
  Visible pour tous les rôles.

## 5. Sécurité et rôles

- `/sync` et `/books/:id/notes` sont refusés au `lecteur` (403) : aucune UI d'écriture pour lui,
  donc file toujours vide ; `synchroniser` s'abstient quand même par sécurité.
- Le jeton ne transite toujours que par l'intercepteur ; `synchroniser` n'en connaît rien.
- La file persistée contient des données métier (titres, notes), pas de secret : `services/storage`
  suffit, pas `stockageSecurise`.

## 6. Tests

**Unitaires (Jest)**

- `services/sync/__tests__/decision.test.ts` — toutes les branches de `decider`, `rejeu`, conflit
  sur `delete`, résultat absent, pureté (mêmes entrées ⇒ même sortie, pas d'accès store).
- `mutation.test.ts` — chaque ligne de la table de fusion, conservation des ids, `enVol`.
- `fusion.test.ts` — `champsEnConflit`, `fusionner`, pré-sélection.
- `file.test.ts`, `conflits.test.ts`, `alias.test.ts` — aller-retour persistance, abonnement.
- `synchroniser.test.ts` — `fetch` simulé : lot envoyé avec ids stables ; 401 `jeton_expire` →
  refresh → **même corps** renvoyé, `rejeu: true` traité ; 503 ⇒ file intacte ; remappage
  `local:` ; notes rejouées et dédupliquées ; vol unique.
- `reseau.test.ts` — bascule sur panne / succès, événements web.
- Hooks `useCreateBook`, `useUpdateBook`, `useToggleBook`, `useDeleteBook`, `useCreateNote` :
  mettent en file + écriture optimiste, plus d'appel API direct.
- `IndicateurSync`, `BarreEmpilee`, `Histogramme`, `EcranFusion` : rendu et libellés accessibles.

**E2E (Playwright, API simulée)**

- `e2e/offline-sync.spec.ts` — recette 4.6 : connexion éditeur → `setOffline(true)` → créer →
  modifier une fiche existante → le mock bascule la version serveur → `setOffline(false)` → le
  mock répond 401 `jeton_expire` au premier `/sync`, puis `ok` + `conflit` → assertions : deux
  `/sync` avec le **même** `id` de création, un seul `create` appliqué, badge conflit, écran de
  fusion, « Appliquer la fusion » ⇒ troisième `/sync` avec `baseVersion` = `versionAttendue`.
- `e2e/offline-cache.spec.ts` — liste chargée, `setOffline(true)`, rechargement : la liste et le
  tableau de bord s'affichent depuis le cache avec la date ; indicateur « Hors ligne ».
- Recette manuelle documentée dans le README contre `npm run final` (auth + chaos).

## 7. Documentation

- `docs/ADR/ADR007.md` — Mode hors ligne : un seul chemin d'écriture, file persistée, idempotence
  par id client, jeton expiré en plein lot, ce qui n'est pas effacé à la déconnexion.
- `docs/ADR/ADR008.md` — Résolution des conflits : fusion assistée, ce que voit le libraire, cas
  `delete` et rejets, pourquoi les bascules `lu`/`favori` ne portent pas de version.
- `README.md` — section « Recette hors ligne (4.6) » pas à pas, avec les `curl`.

## 8. Dépendances

`@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister` (versions
alignées sur `@tanstack/react-query` installée). Entrées de `package-lock.json` insérées à la main
sur la base du lock de `main` (npm local réécrit le lock et casse `npm ci`, cf. lot 4.1).

## 9. Hors périmètre

Recherche et filtres hors ligne sur le cache (le serveur filtre ; hors ligne, seuls les filtres
déjà consultés sont disponibles). Édition d'une note. Synchronisation en arrière-plan quand
l'application est fermée.
