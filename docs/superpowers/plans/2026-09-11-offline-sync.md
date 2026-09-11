# Lot 4.2 → 4.6 — Hors ligne, file de mutations, conflits, tableau de bord : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persisted TanStack cache, a persisted idempotent mutation queue replayed through `POST /sync` (one write path, online or offline), assisted field-by-field conflict merge, an always-visible sync indicator, no input loss, and an offline-readable stats dashboard.

**Architecture:** Every write goes through `services/sync/file.ts` (persisted queue) and is applied optimistically to the TanStack cache by `services/sync/cache.ts`. `services/sync/synchroniser.ts` (single-flight) batches book mutations into `POST /sync` through the existing `client.ts` → interceptor chain (so an expired token mid-batch is refreshed and the *same* ids are replayed), decides each result with the pure `decider()` in `services/sync/decision.ts`, remaps `local:` ids, replays notes one by one with content dedupe, and parks conflicts in `services/sync/conflits.ts` for the merge screen. `services/reseau` is the online/offline signal (browser events + request outcomes). The cache is persisted with `@tanstack/react-query-persist-client` over `services/storage`.

**Tech Stack:** Expo SDK 54, Expo Router 6 (typed routes), React Native Paper, TanStack Query 5.102.8 (+ persist-client, async-storage-persister), zod 4, Jest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-offline-sync-design.md`

## Global Constraints

- Every file < 250 lines. No `any`, no `@ts-ignore`, no `console.*`, no silent `catch` (a comment explains every swallowed error).
- All network code lives in `services/`; `app/`, `components/`, `features/` never call `fetch` or know a URL.
- Pure sync logic: `services/sync/decision.ts`, `mutation.ts`, `fusion.ts` import nothing from `services/storage`, `services/api`, TanStack, or React; they take every input as a parameter (including the clock).
- Idempotence: a mutation `id` is generated once at enqueue (`nouvelId()`) and **never** regenerated. The same body is sent on every retry.
- The refresh token stays in `services/auth/jetons.ts`; `synchroniser` never reads a token.
- UI copy: French, unaccented in string literals (`"Hors ligne"`, `"Synchroniser"`), accents allowed in docs. No exclamation, no emoji.
- Tests use `renderWithTheme` from `test-utils/render.tsx`; assertions by role/label/text. Any test seeding a `QueryClient` calls `client.clear()` in `afterEach` (gc timer keeps Jest alive otherwise).
- Tooling: `npx expo …` is rewritten by a hook → use `rtk proxy npx expo export|lint`. Run Jest with `npx jest <path> 2>&1 | tail -40`. A commit-guard hook blocks agent commits: each "Commit" step = hand the message to the human.
- `package-lock.json`: local npm rewrites the lock and breaks `npm ci`. Never run `npm install`; insert entries by script (Task 1).
- Per `AGENTS.md`, check https://docs.expo.dev/versions/v54.0.0/ before using any new Expo API. No new Expo module is used in this plan.

---

## File map

| Path | Responsibility |
| --- | --- |
| `services/cachePersistant.ts` (new) | persister over `services/storage`, `maxAge`, `buster`, dehydrate filter |
| `services/queryClient.ts` (modify) | `gcTime` 7 days |
| `app/_layout.tsx` (modify) | `PersistQueryClientProvider` |
| `services/reseau/etat.ts`, `index.ts`, `index.web.ts` (new) | online/offline signal |
| `services/api/client.ts` (modify) | `signalerPanne` / `signalerSucces` from request outcomes |
| `domain/sync.ts` (new) | zod schemas: `MutationLocale`, `ResultatSync`, `ReponseSync`, `Conflit`, `ChampsLivre` |
| `domain/stats.ts` (new) | `StatsSchema` |
| `domain/index.ts` (modify) | re-exports |
| `services/sync/mutation.ts` (new, pure) | `nouvelId`, `nouvelIdLocal`, `livreDepuisCreation`, `noteDepuisMutation`, `fusionnerFile` |
| `services/sync/decision.ts` (new, pure) | `decider` |
| `services/sync/fusion.ts` (new, pure) | `champsEnConflit`, `choixInitial`, `fusionner`, `LIBELLES_CHAMPS` |
| `services/sync/storeJson.ts` (new) | `creerStorePersiste<T>` generic persisted store |
| `services/sync/file.ts`, `conflits.ts`, `alias.ts` (new) | the three persisted stores |
| `services/sync/cache.ts` (new) | optimistic cache writes (book insert/update/remove/rename, notes) |
| `services/api/sync.ts`, `services/api/stats.ts` (new) | `envoyerLot`, `lireStats` |
| `services/sync/synchroniser.ts` (new) | orchestration, single-flight, backoff, `planifierSync` |
| `services/queryKeys.ts` (modify) | `statsKeys` |
| `features/books/useCreateBook.ts`, `useUpdateBook.ts`, `useToggleBook.ts`, `useDeleteBook.ts`, `useBook.ts` (modify) | enqueue instead of direct API |
| `features/notes/useCreateNote.ts`, `useNotes.ts` (modify) | enqueue; id resolution |
| `features/sync/useIdReel.ts`, `useSync.ts`, `SyncBootstrap.tsx`, `IndicateurSync.tsx`, `useBrouillon.ts`, `useConflits.ts`, `EcranConflits.tsx`, `EcranFusion.tsx`, `index.ts` (new) | React side of sync |
| `features/session/HeaderActions.tsx`, `CompteMenu.tsx` (modify) | indicator, logout confirmation, dashboard entry |
| `features/books/BookList.tsx`, `BookRecord.tsx`, `features/notes/NoteSection.tsx` (modify) | offline banner, no toggle error notice |
| `components/ui/OfflineBanner.tsx` (new) | "Hors ligne — donnees du cache" |
| `components/notes/NoteComposer.tsx`, `features/books/useBookForm.ts` (modify) | drafts |
| `features/stats/useStats.ts`, `TableauDeBord.tsx` (new), `components/stats/BarreEmpilee.tsx`, `Histogramme.tsx` (new) | dashboard |
| `app/(app)/_layout.tsx` (modify), `app/(app)/conflits/index.tsx`, `conflits/[id].tsx`, `stats.tsx` (new) | routes |
| `e2e/support/api.ts` (modify), `e2e/offline-sync.spec.ts`, `e2e/offline-cache.spec.ts` (new) | recette 4.6 |
| `docs/ADR/ADR007.md`, `ADR008.md` (new), `README.md` (modify) | decisions, recette |

---

### Task 1: Dependencies and persisted cache

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `services/cachePersistant.ts`, `services/__tests__/cachePersistant.test.ts`
- Modify: `services/queryClient.ts`, `app/_layout.tsx`

**Interfaces:**
- Produces: `creerPersister(): Persister`, `optionsPersistance(): { persister, maxAge, buster, dehydrateOptions }`, `CACHE_MAX_AGE_MS`.

- [ ] **Step 1: Add the two dependencies to `package.json` and the lock, by script**

Add to `package.json` dependencies (alphabetical, after `@tanstack/react-query`):

```json
"@tanstack/query-async-storage-persister": "^5.102.8",
"@tanstack/react-query-persist-client": "^5.102.8",
```

Run this once (it inserts the three lock entries, sorted, without touching anything else):

```bash
node -e '
const fs=require("fs");const l=JSON.parse(fs.readFileSync("package-lock.json","utf8"));
const root=l.packages[""];
root.dependencies["@tanstack/query-async-storage-persister"]="^5.102.8";
root.dependencies["@tanstack/react-query-persist-client"]="^5.102.8";
root.dependencies=Object.fromEntries(Object.entries(root.dependencies).sort(([a],[b])=>a.localeCompare(b)));
l.packages["node_modules/@tanstack/query-async-storage-persister"]={version:"5.102.8",resolved:"https://registry.npmjs.org/@tanstack/query-async-storage-persister/-/query-async-storage-persister-5.102.8.tgz",integrity:"sha512-9smqFJWyhRo+0l3NqaGFo6CQVr+3jpKOVZBQXI/LL+GoTIGhhxq1wTZegeI63dy0oResZx/EyazGzDjW8harbg==",license:"MIT",dependencies:{"@tanstack/query-core":"5.102.8","@tanstack/query-persist-client-core":"5.102.8"},funding:{type:"github",url:"https://github.com/sponsors/tannerlinsley"}};
l.packages["node_modules/@tanstack/query-persist-client-core"]={version:"5.102.8",resolved:"https://registry.npmjs.org/@tanstack/query-persist-client-core/-/query-persist-client-core-5.102.8.tgz",integrity:"sha512-t3v4/D6ejo/BrPzM5gm/AT3c4CWPCxFa+0cIjAeHAeanGPG6rCjFS1hZnPZH/rf55qe3qYYgx5U6iBZMY1PQjA==",license:"MIT",dependencies:{"@tanstack/query-core":"5.102.8"},funding:{type:"github",url:"https://github.com/sponsors/tannerlinsley"}};
l.packages["node_modules/@tanstack/react-query-persist-client"]={version:"5.102.8",resolved:"https://registry.npmjs.org/@tanstack/react-query-persist-client/-/react-query-persist-client-5.102.8.tgz",integrity:"sha512-WOZReC+m9klekPtG7eeZ3txJeMA9lg2R0RytSG3yXcZgJItQAVIyoobJdbdIQtlpgcU2tSzsOEBtJacs2vlCOA==",license:"MIT",dependencies:{"@tanstack/query-persist-client-core":"5.102.8"},funding:{type:"github",url:"https://github.com/sponsors/tannerlinsley"},peerDependencies:{"@tanstack/react-query":"^5.102.8",react:"^18 || ^19"}};
const entries=Object.entries(l.packages);const first=entries.shift();
l.packages=Object.fromEntries([first,...entries.sort(([a],[b])=>a.localeCompare(b))]);
fs.writeFileSync("package-lock.json",JSON.stringify(l,null,2)+"\n");'
npm ci --dry-run --ignore-scripts 2>&1 | tail -3
```

Expected: no `EUSAGE`, no "Missing". Then actually install the three tarballs without touching the lock: `npm ci --ignore-scripts` (full reinstall from the lock; ~1 min). Check `git diff --stat package-lock.json` shows only additions.

- [ ] **Step 2: Write the failing test for the persister options**

`services/__tests__/cachePersistant.test.ts`:

```ts
import { enrichmentKeys, bookKeys } from "@/services/queryKeys";
import { CACHE_MAX_AGE_MS, optionsPersistance } from "@/services/cachePersistant";

type Query = Parameters<
  NonNullable<NonNullable<ReturnType<typeof optionsPersistance>["dehydrateOptions"]>["shouldDehydrateQuery"]>
>[0];

function query(queryKey: readonly unknown[], status: "success" | "error" = "success"): Query {
  return { queryKey, state: { status } } as unknown as Query;
}

describe("optionsPersistance", () => {
  it("garde le cache sept jours", () => {
    expect(optionsPersistance().maxAge).toBe(CACHE_MAX_AGE_MS);
    expect(CACHE_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("persiste les livres mais pas l'enrichissement Open Library", () => {
    const filtre = optionsPersistance().dehydrateOptions?.shouldDehydrateQuery;
    if (filtre === undefined) throw new Error("filtre attendu");

    expect(filtre(query(bookKeys.detail("l-1")))).toBe(true);
    expect(filtre(query(enrichmentKeys.byTitle("Dune")))).toBe(false);
  });

  it("ne persiste pas une requete en erreur", () => {
    const filtre = optionsPersistance().dehydrateOptions?.shouldDehydrateQuery;
    if (filtre === undefined) throw new Error("filtre attendu");

    expect(filtre(query(bookKeys.detail("l-1"), "error"))).toBe(false);
  });
});
```

- [ ] **Step 3: Run it, expect failure**

Run: `npx jest services/__tests__/cachePersistant.test.ts 2>&1 | tail -20`
Expected: FAIL, "Cannot find module '@/services/cachePersistant'".

- [ ] **Step 4: Implement `services/cachePersistant.ts`**

```ts
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";

import { enrichmentKeys } from "@/services/queryKeys";

import { storage } from "./storage";

/** A week: long enough for a workstation left off over a holiday. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_KEY = "booklist.cache";

/**
 * The persisted cache behind the whole application.
 *
 * Everything the bookseller has already seen survives a reload and a night
 * without network: on start-up the screen shows what it knew, then revalidates
 * in the background. The persister writes through the same storage contract as
 * the settings, so nothing here knows the platform either.
 *
 * `buster` ties the cache to the application version: a release that changes
 * a schema must not read yesterday's shapes.
 */
export function creerPersister() {
  return createAsyncStoragePersister({
    storage: {
      getItem: (key) => storage.read(key),
      setItem: (key, value) => storage.write(key, value),
      removeItem: (key) => storage.remove(key),
    },
    key: CACHE_KEY,
    throttleTime: 1000,
  });
}

export function optionsPersistance(): Omit<PersistQueryClientOptions, "queryClient"> {
  return {
    persister: creerPersister(),
    maxAge: CACHE_MAX_AGE_MS,
    buster: Constants.expoConfig?.version ?? "dev",
    dehydrateOptions: {
      // Open Library answers are a convenience, not the bookseller's data; a
      // failed query holds nothing worth keeping.
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && query.queryKey[0] !== enrichmentKeys.all[0],
    },
  };
}
```

- [ ] **Step 5: Run the test, expect pass**

Run: `npx jest services/__tests__/cachePersistant.test.ts 2>&1 | tail -20`
Expected: PASS (3 tests). If `expo-constants` fails under Jest, mock it in `jest.setup.js`: `jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { version: "test" } } }));`

- [ ] **Step 6: `gcTime` in `services/queryClient.ts`**

In `defaultOptions.queries`, add after `staleTime`:

```ts
        // Entries garbage-collected before the persister writes them would
        // never reach the disk: kept as long as the persisted cache itself.
        gcTime: CACHE_MAX_AGE_MS,
```

with `import { CACHE_MAX_AGE_MS } from "./cachePersistant";`.

- [ ] **Step 7: Mount the provider in `app/_layout.tsx`**

Replace the `QueryClientProvider` import and usage:

```tsx
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { optionsPersistance } from "@/services/cachePersistant";
```

```tsx
export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  // Built once with the client: the persister opens the storage on creation.
  const [persistOptions] = useState(optionsPersistance);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <SessionProvider>
            <ThemedApp />
          </SessionProvider>
        </PersistQueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 8: Typecheck, lint, full Jest**

Run: `npx tsc --noEmit 2>&1 | tail -5 && rtk proxy npx expo lint 2>&1 | tail -5 && npx jest 2>&1 | tail -8`
Expected: 0 errors, all suites green.

- [ ] **Step 9: Commit**

```
feat(cache): persist the query cache for seven days

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 2: Network signal

**Files:**
- Create: `services/reseau/etat.ts`, `services/reseau/index.ts`, `services/reseau/index.web.ts`, `services/reseau/__tests__/etat.test.ts`
- Modify: `services/api/client.ts`

**Interfaces:**
- Produces (from `@/services/reseau`): `estEnLigne(): boolean`, `signalerPanne(): void`, `signalerSucces(): void`, `surChangement(abonne: (enLigne: boolean) => void): () => void`, `brancherNavigateur(cible: CibleNavigateur): () => void`, `reinitialiserPourTests(): void`.

- [ ] **Step 1: Failing test**

`services/reseau/__tests__/etat.test.ts`:

```ts
import {
  brancherNavigateur,
  estEnLigne,
  reinitialiserPourTests,
  signalerPanne,
  signalerSucces,
  surChangement,
} from "@/services/reseau/etat";

afterEach(reinitialiserPourTests);

describe("etat reseau", () => {
  it("est en ligne au depart", () => {
    expect(estEnLigne()).toBe(true);
  });

  it("bascule hors ligne sur une panne et revient au premier succes", () => {
    const vu: boolean[] = [];
    surChangement((v) => vu.push(v));

    signalerPanne();
    signalerPanne();
    signalerSucces();

    expect(vu).toEqual([false, true]);
    expect(estEnLigne()).toBe(true);
  });

  it("suit les evenements du navigateur", () => {
    const ecouteurs = new Map<string, () => void>();
    const cible = {
      onLine: false,
      addEventListener: (nom: string, f: () => void) => {
        ecouteurs.set(nom, f);
      },
      removeEventListener: (nom: string) => {
        ecouteurs.delete(nom);
      },
    };

    const arreter = brancherNavigateur(cible);
    expect(estEnLigne()).toBe(false);

    ecouteurs.get("online")?.();
    expect(estEnLigne()).toBe(true);

    arreter();
    expect(ecouteurs.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect failure** — `npx jest services/reseau 2>&1 | tail -20` → "Cannot find module".

- [ ] **Step 3: Implement `services/reseau/etat.ts`**

```ts
export type AbonneReseau = (enLigne: boolean) => void;

/** The subset of `window`/`navigator` the browser wiring needs; injectable. */
export type CibleNavigateur = {
  onLine: boolean;
  addEventListener: (nom: "online" | "offline", ecouteur: () => void) => void;
  removeEventListener: (nom: "online" | "offline", ecouteur: () => void) => void;
};

/**
 * Whether the shop is reachable, as far as the application can tell.
 *
 * Two sources feed one boolean: the browser's own signal (`online`/`offline`
 * events), and the outcome of our requests — a fetch that never reached the
 * server flips us offline, the next answer of any status flips us back. A 503
 * is not "offline": the server answered, it is merely struggling.
 *
 * Native has no dependency-free signal here and starts online; the request
 * outcome corrects it within one call.
 */
let enLigne = true;
const abonnes = new Set<AbonneReseau>();

function publier(valeur: boolean): void {
  if (enLigne === valeur) return;
  enLigne = valeur;
  abonnes.forEach((abonne) => abonne(valeur));
}

export function estEnLigne(): boolean {
  return enLigne;
}

export function signalerPanne(): void {
  publier(false);
}

export function signalerSucces(): void {
  publier(true);
}

export function surChangement(abonne: AbonneReseau): () => void {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

export function brancherNavigateur(cible: CibleNavigateur): () => void {
  const surEnLigne = () => publier(true);
  const surHorsLigne = () => publier(false);

  publier(cible.onLine);
  cible.addEventListener("online", surEnLigne);
  cible.addEventListener("offline", surHorsLigne);

  return () => {
    cible.removeEventListener("online", surEnLigne);
    cible.removeEventListener("offline", surHorsLigne);
  };
}

/** Tests only. */
export function reinitialiserPourTests(): void {
  enLigne = true;
  abonnes.clear();
}
```

`services/reseau/index.ts`:

```ts
export * from "./etat";
```

`services/reseau/index.web.ts`:

```ts
import { brancherNavigateur } from "./etat";

export * from "./etat";

/**
 * Browser target: wired once at import. `navigator.onLine` is what Playwright's
 * `context.setOffline` drives, so the acceptance run and the till agree.
 */
if (typeof window !== "undefined" && typeof navigator !== "undefined") {
  brancherNavigateur({
    get onLine() {
      return navigator.onLine;
    },
    addEventListener: (nom, ecouteur) => window.addEventListener(nom, ecouteur),
    removeEventListener: (nom, ecouteur) => window.removeEventListener(nom, ecouteur),
  });
}
```

- [ ] **Step 4: Run, expect pass** — `npx jest services/reseau 2>&1 | tail -10`.

- [ ] **Step 5: Feed the signal from `services/api/client.ts`**

In `send()`, after `const response = await envoyerAuthentifie(url, options);` add `signalerSucces();` (the server answered, whatever the status). In the `catch (cause)` branch, after `error = cause;` add:

```ts
      // No status: the request never reached the server.
      if (error.detail.kind === "network" && error.detail.status === undefined) signalerPanne();
```

Import: `import { signalerPanne, signalerSucces } from "@/services/reseau";`

- [ ] **Step 6: Existing client tests stay green** — `npx jest services/api 2>&1 | tail -8`.

- [ ] **Step 7: Commit**

```
feat(reseau): online/offline signal from browser events and request outcomes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 3: Domain schemas and pure mutation helpers

**Files:**
- Create: `domain/sync.ts`, `services/sync/mutation.ts`, `services/sync/__tests__/mutation.test.ts`
- Modify: `domain/index.ts`, `services/api/books.ts` (`BookPatch` becomes an alias of `ChampsLivre`)

**Interfaces:**
- Produces (`@/domain`): `LOCAL_ID_PREFIX = "local:"`, `estIdLocal(id)`, `ChampsLivreSchema`/`ChampsLivre`, `LivreCreationSchema`/`LivreCreation` (`BookDraft & { favori?, note? }`), `MutationLocaleSchema`/`MutationLocale`, `MutationLivre`, `MutationNote`, `ResultatSyncSchema`/`ResultatSync`, `ReponseSyncSchema`/`ReponseSync`, `ConflitSchema`/`Conflit`.
- Produces (`services/sync/mutation.ts`): `nouvelId(): string`, `nouvelIdLocal(): string`, `livreDepuisCreation(m, maintenant: string): Book`, `noteDepuisMutation(m): Note`, `fusionnerFile(file, nouvelle, enVol?): MutationLocale[]`.

- [ ] **Step 1: `domain/sync.ts`**

```ts
import { z } from "zod";

import { BookDraftSchema, BookSchema } from "./book";

/** Identifier of a book created offline, before the server names it. */
export const LOCAL_ID_PREFIX = "local:";

export function estIdLocal(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

/** Fields a partial update may carry — the PATCH / sync `update` contract. */
export const ChampsLivreSchema = z.object({
  titre: z.string().optional(),
  auteur: z.string().optional(),
  editeur: z.string().optional(),
  annee: z.number().int().optional(),
  lu: z.boolean().optional(),
  favori: z.boolean().optional(),
  note: z.number().nullable().optional(),
});

export type ChampsLivre = z.infer<typeof ChampsLivreSchema>;

/** What a creation carries: the form's draft, plus toggles made before sync. */
export const LivreCreationSchema = BookDraftSchema.extend({
  favori: z.boolean().optional(),
  note: z.number().nullable().optional(),
});

export type LivreCreation = z.infer<typeof LivreCreationSchema>;

const Base = {
  /** Client identifier, generated once, kept across retries: the server's idempotence key. */
  id: z.string(),
  creeLe: z.string(),
  livreId: z.string(),
};

/**
 * One intention of the bookseller, persisted until the server has settled it.
 * Notes are queued too, but replayed through their own route: `/sync` only
 * knows books.
 */
export const MutationLocaleSchema = z.discriminatedUnion("type", [
  z.object({ ...Base, type: z.literal("create"), livre: LivreCreationSchema }),
  z.object({
    ...Base,
    type: z.literal("update"),
    baseVersion: z.number().int().optional(),
    champs: ChampsLivreSchema,
  }),
  z.object({ ...Base, type: z.literal("delete"), baseVersion: z.number().int().optional() }),
  z.object({ ...Base, type: z.literal("note"), contenu: z.string() }),
]);

export type MutationLocale = z.infer<typeof MutationLocaleSchema>;
export type MutationLivre = Exclude<MutationLocale, { type: "note" }>;
export type MutationNote = Extract<MutationLocale, { type: "note" }>;

/**
 * One line of the `/sync` answer. A replayed result (`rejeu: true`) is echoed
 * from the server's memory and may lack `serveur` or `message`: hence optional.
 */
export const ResultatSyncSchema = z.discriminatedUnion("statut", [
  z.object({
    id: z.string().nullable(),
    statut: z.literal("ok"),
    livre: BookSchema.nullable().optional(),
    rejeu: z.boolean().optional(),
  }),
  z.object({
    id: z.string(),
    statut: z.literal("conflit"),
    serveur: BookSchema.optional(),
    versionAttendue: z.number().int().optional(),
    rejeu: z.boolean().optional(),
  }),
  z.object({
    id: z.string().nullable(),
    statut: z.literal("erreur"),
    message: z.string().optional(),
    champs: z.record(z.string(), z.string()).optional(),
    rejeu: z.boolean().optional(),
  }),
]);

export type ResultatSync = z.infer<typeof ResultatSyncSchema>;

export const ReponseSyncSchema = z.object({
  resultats: z.array(ResultatSyncSchema),
  serveurLe: z.string().optional(),
});

export type ReponseSync = z.infer<typeof ReponseSyncSchema>;

/**
 * A mutation the server would not apply as is, waiting for the bookseller.
 * `conflit`: the record moved on; `rejet`: refused (422) or gone (404). The
 * mutation itself is kept whole so nothing typed is ever lost.
 */
export const ConflitSchema = z.object({
  id: z.string(),
  type: z.enum(["conflit", "rejet"]),
  mutation: MutationLocaleSchema,
  serveur: BookSchema.optional(),
  versionAttendue: z.number().int().optional(),
  motif: z.string().optional(),
  champs: z.record(z.string(), z.string()).optional(),
  detecteLe: z.string(),
});

export type Conflit = z.infer<typeof ConflitSchema>;
```

Add to `domain/index.ts`:

```ts
export {
  ChampsLivreSchema,
  ConflitSchema,
  estIdLocal,
  LivreCreationSchema,
  LOCAL_ID_PREFIX,
  MutationLocaleSchema,
  ReponseSyncSchema,
  ResultatSyncSchema,
  type ChampsLivre,
  type Conflit,
  type LivreCreation,
  type MutationLivre,
  type MutationLocale,
  type MutationNote,
  type ReponseSync,
  type ResultatSync,
} from "./sync";
```

In `services/api/books.ts`, replace the `BookPatch` type with `export type BookPatch = ChampsLivre;` (`import type { ChampsLivre } from "@/domain"`).

- [ ] **Step 2: Failing tests for the pure helpers**

`services/sync/__tests__/mutation.test.ts`:

```ts
import type { MutationLocale } from "@/domain";
import {
  fusionnerFile,
  livreDepuisCreation,
  noteDepuisMutation,
  nouvelId,
  nouvelIdLocal,
} from "@/services/sync/mutation";

const T = "2026-09-11T10:00:00.000Z";

const creation: MutationLocale = {
  id: "m-c",
  type: "create",
  creeLe: T,
  livreId: "local:1",
  livre: { titre: "Dune", auteur: "Herbert", editeur: "Laffont", annee: 1965, lu: false },
};

type Maj = Extract<MutationLocale, { type: "update" }>;
const maj = (extra: Partial<Maj>): MutationLocale => ({
  id: "m-u",
  type: "update",
  creeLe: T,
  livreId: "l-1",
  champs: {},
  ...extra,
});

describe("identifiants", () => {
  it("sont uniques et les locaux sont prefixes", () => {
    expect(nouvelId()).not.toBe(nouvelId());
    expect(nouvelIdLocal()).toMatch(/^local:/);
  });
});

describe("livreDepuisCreation", () => {
  it("fabrique la fiche telle que la liste la montre avant le serveur", () => {
    const livre = livreDepuisCreation(creation, T);
    expect(livre).toMatchObject({ id: "local:1", titre: "Dune", version: 0, favori: false, note: null, couverture: null, createdAt: T });
  });
});

describe("noteDepuisMutation", () => {
  it("porte l'id local derive de la mutation", () => {
    const note = noteDepuisMutation({ id: "m-n", type: "note", creeLe: T, livreId: "l-1", contenu: "Bien" });
    expect(note).toEqual({ id: "local:m-n", livreId: "l-1", contenu: "Bien", createdAt: T });
  });
});

describe("fusionnerFile", () => {
  it("ajoute une mutation sur un livre inconnu de la file", () => {
    expect(fusionnerFile([], maj({ champs: { lu: true } }))).toHaveLength(1);
  });

  it("fusionne deux updates du meme livre en gardant le premier id et la premiere baseVersion", () => {
    const file = [maj({ id: "a", baseVersion: 3, champs: { titre: "A" } })];
    const resultat = fusionnerFile(file, maj({ id: "b", champs: { lu: true, titre: "B" } }));

    expect(resultat).toEqual([
      expect.objectContaining({ id: "a", baseVersion: 3, champs: { titre: "B", lu: true } }),
    ]);
  });

  it("prend la baseVersion de la nouvelle si la premiere n'en avait pas", () => {
    const file = [maj({ id: "a", champs: { favori: true } })];
    const resultat = fusionnerFile(file, maj({ id: "b", baseVersion: 5, champs: { titre: "B" } }));
    expect(resultat[0]).toMatchObject({ id: "a", baseVersion: 5 });
  });

  it("replie une update sur une creation locale", () => {
    const resultat = fusionnerFile([creation], maj({ livreId: "local:1", champs: { favori: true, titre: "Dune 2" } }));
    expect(resultat).toEqual([
      expect.objectContaining({ id: "m-c", type: "create", livre: expect.objectContaining({ titre: "Dune 2", favori: true }) }),
    ]);
  });

  it("annule creation et notes locales quand le livre local est supprime", () => {
    const note: MutationLocale = { id: "m-n", type: "note", creeLe: T, livreId: "local:1", contenu: "x" };
    const resultat = fusionnerFile([creation, note], { id: "m-d", type: "delete", creeLe: T, livreId: "local:1" });
    expect(resultat).toEqual([]);
  });

  it("remplace une update par la suppression qui la suit", () => {
    const file = [maj({ id: "a", baseVersion: 3, champs: { titre: "A" } })];
    const resultat = fusionnerFile(file, { id: "d", type: "delete", creeLe: T, livreId: "l-1" });
    expect(resultat).toEqual([expect.objectContaining({ id: "a", type: "delete", baseVersion: 3 })]);
  });

  it("n'ajoute jamais deux fois une note et ne la fusionne pas", () => {
    const n1: MutationLocale = { id: "n1", type: "note", creeLe: T, livreId: "l-1", contenu: "a" };
    const n2: MutationLocale = { id: "n2", type: "note", creeLe: T, livreId: "l-1", contenu: "b" };
    expect(fusionnerFile([n1], n2)).toHaveLength(2);
  });

  it("ne touche pas a une mutation en vol : la nouvelle est ajoutee a part", () => {
    const file = [maj({ id: "a", champs: { titre: "A" } })];
    const resultat = fusionnerFile(file, maj({ id: "b", champs: { lu: true } }), new Set(["a"]));
    expect(resultat.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("ne modifie pas la file recue", () => {
    const file = [maj({ id: "a", champs: { titre: "A" } })];
    const copie = structuredClone(file);
    fusionnerFile(file, maj({ id: "b", champs: { lu: true } }));
    expect(file).toEqual(copie);
  });
});
```

- [ ] **Step 3: Run, expect failure** — `npx jest services/sync 2>&1 | tail -20`.

- [ ] **Step 4: Implement `services/sync/mutation.ts`**

```ts
import {
  LOCAL_ID_PREFIX,
  type Book,
  type MutationLocale,
  type MutationNote,
  type Note,
} from "@/domain";

/**
 * Pure helpers around the mutation queue. Nothing here touches storage, the
 * network or the clock: every input is a parameter, which is what makes the
 * fusion table below testable line by line.
 */

/** Idempotence key. `crypto.randomUUID` exists on the browser and on Hermes. */
export function nouvelId(): string {
  const c = globalThis.crypto;
  if (c !== undefined && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nouvelIdLocal(): string {
  return `${LOCAL_ID_PREFIX}${nouvelId()}`;
}

/** The record as the list shows it before the server has named it. */
export function livreDepuisCreation(
  m: Extract<MutationLocale, { type: "create" }>,
  maintenant: string,
): Book {
  return {
    id: m.livreId,
    titre: m.livre.titre,
    auteur: m.livre.auteur,
    editeur: m.livre.editeur,
    annee: m.livre.annee,
    lu: m.livre.lu,
    favori: m.livre.favori ?? false,
    note: m.livre.note ?? null,
    couverture: null,
    createdAt: maintenant,
    updatedAt: maintenant,
    version: 0,
  };
}

/** The note as the list shows it; its id is derived so sync can find it back. */
export function noteDepuisMutation(m: MutationNote): Note {
  return { id: `${LOCAL_ID_PREFIX}${m.id}`, livreId: m.livreId, contenu: m.contenu, createdAt: m.creeLe };
}

/**
 * Adds a mutation to the queue, folding it into an earlier one on the same
 * book when that is what the server would do anyway. Two edits of a title are
 * one edit; creating then deleting is nothing. Fewer lines in the batch, fewer
 * conflicts to arbitrate.
 *
 * A mutation already in flight is never touched: the batch on the wire must
 * stay exactly what was sent.
 */
export function fusionnerFile(
  file: readonly MutationLocale[],
  nouvelle: MutationLocale,
  enVol: ReadonlySet<string> = new Set(),
): MutationLocale[] {
  if (nouvelle.type === "note") return [...file, nouvelle];

  const index = file.findIndex(
    (m) => m.type !== "note" && m.livreId === nouvelle.livreId && !enVol.has(m.id),
  );
  if (index === -1) return [...file, nouvelle];

  const existante = file[index] as Exclude<MutationLocale, { type: "note" }>;
  const sans = file.filter((_, i) => i !== index);

  if (nouvelle.type === "delete") {
    if (existante.type === "create") {
      // Never left the till: the book and everything attached to it vanish.
      return sans.filter((m) => m.livreId !== nouvelle.livreId);
    }
    // existante is an update or a delete here: both may carry a baseVersion.
    return [...sans, { ...nouvelle, id: existante.id, baseVersion: existante.baseVersion ?? nouvelle.baseVersion }];
  }

  // nouvelle.type === "update"
  if (existante.type === "create") {
    return [...sans, { ...existante, livre: { ...existante.livre, ...nouvelle.champs } }];
  }
  if (existante.type === "update") {
    return [
      ...sans,
      {
        ...existante,
        baseVersion: existante.baseVersion ?? nouvelle.baseVersion,
        champs: { ...existante.champs, ...nouvelle.champs },
      },
    ];
  }
  // An update after a delete cannot come from the interface; keep both.
  return [...file, nouvelle];
}
```

Note: `{ ...existante.livre, ...nouvelle.champs }` may carry `undefined` values from optional fields; zod `.optional()` accepts them and `JSON.stringify` drops them. The `note` field on `ChampsLivre` (nullable) is fine on `LivreCreation`.

- [ ] **Step 5: Run, expect pass** — `npx jest services/sync 2>&1 | tail -10`. Then `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```
feat(sync): mutation model and pure queue folding

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 4: The pure decider

**Files:**
- Create: `services/sync/decision.ts`, `services/sync/__tests__/decision.test.ts`

**Interfaces:**
- Produces: `type Decision = { action: "retirer"; livre: Book | null; alias?: { local: string; serveur: string } } | { action: "conflit"; conflit: Conflit } | { action: "rejeter"; conflit: Conflit } | { action: "garder" }`, `decider(m: MutationLivre, r: ResultatSync | undefined, detecteLe: string): Decision`.

- [ ] **Step 1: Failing tests**

`services/sync/__tests__/decision.test.ts`:

```ts
import type { Book, MutationLivre, ResultatSync } from "@/domain";
import { decider } from "@/services/sync/decision";

const T = "2026-09-11T10:00:00.000Z";

const serveur: Book = {
  id: "l-1", titre: "Modifie par le serveur", auteur: "A", editeur: "E", annee: 2000,
  lu: false, favori: false, note: null, couverture: null, createdAt: T, updatedAt: T, version: 4,
};

const creation: MutationLivre = {
  id: "m-c", type: "create", creeLe: T, livreId: "local:1",
  livre: { titre: "Dune", auteur: "Herbert", editeur: "L", annee: 1965, lu: false },
};
const maj: MutationLivre = { id: "m-u", type: "update", creeLe: T, livreId: "l-1", baseVersion: 3, champs: { titre: "Mien" } };
const suppression: MutationLivre = { id: "m-d", type: "delete", creeLe: T, livreId: "l-1", baseVersion: 3 };

describe("decider", () => {
  it("retire une creation acceptee et fournit l'alias local -> serveur", () => {
    const r: ResultatSync = { id: "m-c", statut: "ok", livre: { ...serveur, id: "srv-9" } };
    expect(decider(creation, r, T)).toEqual({
      action: "retirer", livre: { ...serveur, id: "srv-9" }, alias: { local: "local:1", serveur: "srv-9" },
    });
  });

  it("traite un rejeu comme un succes : la creation n'est pas refaite", () => {
    const r: ResultatSync = { id: "m-c", statut: "ok", rejeu: true, livre: { ...serveur, id: "srv-9" } };
    expect(decider(creation, r, T)).toMatchObject({ action: "retirer", alias: { serveur: "srv-9" } });
  });

  it("retire une suppression acceptee sans livre", () => {
    expect(decider(suppression, { id: "m-d", statut: "ok" }, T)).toEqual({ action: "retirer", livre: null });
  });

  it("transforme un conflit en conflit a arbitrer, mutation intacte", () => {
    const r: ResultatSync = { id: "m-u", statut: "conflit", serveur, versionAttendue: 4 };
    expect(decider(maj, r, T)).toEqual({
      action: "conflit",
      conflit: { id: "m-u", type: "conflit", mutation: maj, serveur, versionAttendue: 4, detecteLe: T },
    });
  });

  it("garde un conflit sur une suppression", () => {
    const r: ResultatSync = { id: "m-d", statut: "conflit", serveur, versionAttendue: 4 };
    expect(decider(suppression, r, T)).toMatchObject({ action: "conflit", conflit: { mutation: suppression } });
  });

  it("accepte un conflit rejoue sans version serveur", () => {
    const r: ResultatSync = { id: "m-u", statut: "conflit", rejeu: true };
    expect(decider(maj, r, T)).toMatchObject({ action: "conflit", conflit: { serveur: undefined } });
  });

  it("rejette une saisie refusee champ par champ", () => {
    const r: ResultatSync = { id: "m-c", statut: "erreur", champs: { annee: "annee invalide" } };
    expect(decider(creation, r, T)).toEqual({
      action: "rejeter",
      conflit: { id: "m-c", type: "rejet", mutation: creation, motif: "La saisie a ete refusee par le serveur.", champs: { annee: "annee invalide" }, detecteLe: T },
    });
  });

  it("rejette une modification d'un livre disparu", () => {
    const r: ResultatSync = { id: "m-u", statut: "erreur", message: "livre introuvable" };
    expect(decider(maj, r, T)).toMatchObject({ action: "rejeter", conflit: { motif: "Cette fiche a ete supprimee cote serveur." } });
  });

  it("garde la mutation quand le serveur n'a rien dit d'exploitable", () => {
    expect(decider(maj, undefined, T)).toEqual({ action: "garder" });
    expect(decider(maj, { id: "m-u", statut: "erreur", message: "type inconnu" }, T)).toEqual({ action: "garder" });
  });

  it("est pure : memes entrees, meme sortie, entrees intactes", () => {
    const r: ResultatSync = { id: "m-u", statut: "conflit", serveur, versionAttendue: 4 };
    const copie = structuredClone({ maj, r });
    expect(decider(maj, r, T)).toEqual(decider(maj, r, T));
    expect({ maj, r }).toEqual(copie);
  });
});
```

- [ ] **Step 2: Run, expect failure** — `npx jest services/sync/__tests__/decision 2>&1 | tail -20`.

- [ ] **Step 3: Implement `services/sync/decision.ts`**

```ts
import type { Book, Conflit, MutationLivre, ResultatSync } from "@/domain";

export type Decision =
  | { action: "retirer"; livre: Book | null; alias?: { local: string; serveur: string } }
  | { action: "conflit"; conflit: Conflit }
  | { action: "rejeter"; conflit: Conflit }
  | { action: "garder" };

export const MOTIF_REFUS = "La saisie a ete refusee par le serveur.";
export const MOTIF_DISPARU = "Cette fiche a ete supprimee cote serveur.";

/**
 * What becomes of one mutation once the server has spoken.
 *
 * The one function the brief asks to be pure and tested: no store, no cache, no
 * clock. `detecteLe` is passed in. The caller applies the decision; this
 * function only names it.
 *
 * A replay (`rejeu`) is a success or a conflict like any other: the server did
 * the work the first time, we are only late hearing about it.
 */
export function decider(
  m: MutationLivre,
  r: ResultatSync | undefined,
  detecteLe: string,
): Decision {
  if (r === undefined) return { action: "garder" };

  switch (r.statut) {
    case "ok": {
      const livre = r.livre ?? null;
      if (m.type === "create" && livre !== null) {
        return { action: "retirer", livre, alias: { local: m.livreId, serveur: livre.id } };
      }
      return { action: "retirer", livre };
    }

    case "conflit":
      return {
        action: "conflit",
        conflit: {
          id: m.id,
          type: "conflit",
          mutation: m,
          serveur: r.serveur,
          versionAttendue: r.versionAttendue,
          detecteLe,
        },
      };

    case "erreur": {
      if (r.champs !== undefined) {
        return {
          action: "rejeter",
          conflit: { id: m.id, type: "rejet", mutation: m, motif: MOTIF_REFUS, champs: r.champs, detecteLe },
        };
      }
      if (r.message === "livre introuvable") {
        return {
          action: "rejeter",
          conflit: { id: m.id, type: "rejet", mutation: m, motif: MOTIF_DISPARU, detecteLe },
        };
      }
      // Anything else is the server's problem, not the bookseller's: retry later.
      return { action: "garder" };
    }
  }
}
```

- [ ] **Step 4: Run, expect pass** — `npx jest services/sync 2>&1 | tail -10`.

- [ ] **Step 5: Commit**

```
feat(sync): pure decider for /sync results, conflicts included

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 5: Pure merge helpers

**Files:**
- Create: `services/sync/fusion.ts`, `services/sync/__tests__/fusion.test.ts`

**Interfaces:**
- Produces: `CHAMPS_FUSION`, `type ChampFusion = "titre"|"auteur"|"editeur"|"annee"|"lu"|"favori"`, `type Choix = "locale"|"serveur"`, `type LigneFusion = { champ; locale: string|number|boolean; serveur: string|number|boolean; differe: boolean }`, `LIBELLES_CHAMPS: Record<ChampFusion,string>`, `champsEnConflit(m: MutationLivre, serveur: Book): LigneFusion[]`, `choixInitial(lignes): Partial<Record<ChampFusion, Choix>>`, `fusionner(lignes, choix): ChampsLivre`, `afficherValeur(champ, valeur): string`.

- [ ] **Step 1: Failing tests**

`services/sync/__tests__/fusion.test.ts`:

```ts
import type { Book, MutationLivre } from "@/domain";
import { afficherValeur, champsEnConflit, choixInitial, fusionner } from "@/services/sync/fusion";

const T = "2026-09-11T10:00:00.000Z";
const serveur: Book = {
  id: "l-1", titre: "Serveur", auteur: "A", editeur: "E", annee: 2000, lu: true, favori: false,
  note: null, couverture: null, createdAt: T, updatedAt: T, version: 4,
};
const maj: MutationLivre = {
  id: "m", type: "update", creeLe: T, livreId: "l-1", baseVersion: 3,
  champs: { titre: "Mien", auteur: "A", lu: false },
};

describe("champsEnConflit", () => {
  it("ne liste que les champs que le libraire a touches, et dit lesquels different", () => {
    expect(champsEnConflit(maj, serveur)).toEqual([
      { champ: "titre", locale: "Mien", serveur: "Serveur", differe: true },
      { champ: "auteur", locale: "A", serveur: "A", differe: false },
      { champ: "lu", locale: false, serveur: true, differe: true },
    ]);
  });

  it("liste tous les champs d'une creation", () => {
    const c: MutationLivre = { id: "c", type: "create", creeLe: T, livreId: "local:1", livre: { titre: "X", auteur: "Y", editeur: "Z", annee: 1999, lu: false } };
    expect(champsEnConflit(c, serveur).map((l) => l.champ)).toEqual(["titre", "auteur", "editeur", "annee", "lu"]);
  });

  it("est vide pour une suppression", () => {
    expect(champsEnConflit({ id: "d", type: "delete", creeLe: T, livreId: "l-1" }, serveur)).toEqual([]);
  });
});

describe("choixInitial", () => {
  it("preselectionne la version locale la ou elle differe seulement", () => {
    expect(choixInitial(champsEnConflit(maj, serveur))).toEqual({ titre: "locale", lu: "locale" });
  });
});

describe("fusionner", () => {
  it("ne renvoie que les champs ou le libraire garde sa version", () => {
    const lignes = champsEnConflit(maj, serveur);
    expect(fusionner(lignes, { titre: "locale", lu: "serveur" })).toEqual({ titre: "Mien" });
  });

  it("renvoie un objet vide si tout vient du serveur", () => {
    expect(fusionner(champsEnConflit(maj, serveur), {})).toEqual({});
  });
});

describe("afficherValeur", () => {
  it("dit Lu / Non lu et Oui / Non plutot que true / false", () => {
    expect(afficherValeur("lu", true)).toBe("Lu");
    expect(afficherValeur("lu", false)).toBe("Non lu");
    expect(afficherValeur("favori", true)).toBe("Oui");
    expect(afficherValeur("annee", 1965)).toBe("1965");
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `services/sync/fusion.ts`**

```ts
import type { Book, ChampsLivre, MutationLivre } from "@/domain";

/** The fields a bookseller can arbitrate. `note`/`couverture` are not edited by the form. */
export const CHAMPS_FUSION = ["titre", "auteur", "editeur", "annee", "lu", "favori"] as const;
export type ChampFusion = (typeof CHAMPS_FUSION)[number];
export type Choix = "locale" | "serveur";
type Valeur = string | number | boolean;

export type LigneFusion = { champ: ChampFusion; locale: Valeur; serveur: Valeur; differe: boolean };

export const LIBELLES_CHAMPS: Record<ChampFusion, string> = {
  titre: "Titre",
  auteur: "Auteur",
  editeur: "Editeur",
  annee: "Annee",
  lu: "Statut de lecture",
  favori: "Coup de coeur",
};

/**
 * Field-by-field comparison between what the bookseller changed and what the
 * server holds now. Only touched fields appear: a colleague's correction on a
 * field the bookseller never opened is not theirs to arbitrate.
 */
export function champsEnConflit(m: MutationLivre, serveur: Book): LigneFusion[] {
  if (m.type === "delete") return [];
  const locales: ChampsLivre = m.type === "create" ? m.livre : m.champs;

  return CHAMPS_FUSION.flatMap((champ) => {
    const locale = locales[champ];
    if (locale === undefined) return [];
    const distante = serveur[champ];
    return [{ champ, locale, serveur: distante, differe: locale !== distante }];
  });
}

/** Pre-selection: the bookseller's own value wherever the two differ. */
export function choixInitial(lignes: readonly LigneFusion[]): Partial<Record<ChampFusion, Choix>> {
  const choix: Partial<Record<ChampFusion, Choix>> = {};
  for (const ligne of lignes) if (ligne.differe) choix[ligne.champ] = "locale";
  return choix;
}

/** The patch to send: exactly the fields kept from the local version. */
export function fusionner(
  lignes: readonly LigneFusion[],
  choix: Partial<Record<ChampFusion, Choix>>,
): ChampsLivre {
  const patch: Record<string, Valeur> = {};
  for (const ligne of lignes) if (choix[ligne.champ] === "locale") patch[ligne.champ] = ligne.locale;
  return patch as ChampsLivre;
}

export function afficherValeur(champ: ChampFusion, valeur: Valeur): string {
  if (champ === "lu") return valeur === true ? "Lu" : "Non lu";
  if (champ === "favori") return valeur === true ? "Oui" : "Non";
  return String(valeur);
}
```

- [ ] **Step 4: Run, expect pass** — `npx jest services/sync 2>&1 | tail -10`; `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```
feat(sync): pure field-by-field merge helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 6: Persisted stores — queue, conflicts, aliases

**Files:**
- Create: `services/sync/storeJson.ts`, `services/sync/file.ts`, `services/sync/conflits.ts`, `services/sync/alias.ts`, `services/sync/__tests__/stores.test.ts`

**Interfaces:**
- Produces (`storeJson.ts`): `creerStorePersiste<T>(cle, schema: z.ZodType<T>, defaut: T): StorePersiste<T>` with `{ lire(): T; charger(): Promise<T>; ecrire(v: T): Promise<void>; surChangement(f: () => void): () => void; reinitialiserPourTests(): void }`.
- Produces (`file.ts`): `chargerFile()`, `lireFile(): MutationLocale[]`, `surChangementFile`, `ajouterMutation(m): Promise<void>`, `retirerMutations(ids: readonly string[]): Promise<void>`, `reecrireLivreIdFile(local, reel): Promise<void>`, `marquerEnVol(ids)`, `libererEnVol(ids)`, `reinitialiserFilePourTests()`.
- Produces (`conflits.ts`): `chargerConflits()`, `lireConflits(): Conflit[]`, `surChangementConflits`, `ajouterConflit(c)`, `retirerConflit(id)`, `reecrireLivreIdConflits(local, reel)`, `reinitialiserConflitsPourTests()`.
- Produces (`alias.ts`): `chargerAlias()`, `resoudreId(id): string`, `ajouterAlias(local, reel)`, `surChangementAlias`, `reinitialiserAliasPourTests()`.

- [ ] **Step 1: Failing tests**

`services/sync/__tests__/stores.test.ts`:

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MutationLocale } from "@/domain";
import { ajouterAlias, chargerAlias, reinitialiserAliasPourTests, resoudreId } from "@/services/sync/alias";
import {
  ajouterConflit, chargerConflits, lireConflits, reinitialiserConflitsPourTests, retirerConflit,
} from "@/services/sync/conflits";
import {
  ajouterMutation, chargerFile, lireFile, marquerEnVol, reecrireLivreIdFile,
  reinitialiserFilePourTests, retirerMutations, surChangementFile,
} from "@/services/sync/file";

const T = "2026-09-11T10:00:00.000Z";
const maj = (id: string, livreId = "l-1"): MutationLocale => ({ id, type: "update", creeLe: T, livreId, champs: { lu: true } });

afterEach(async () => {
  reinitialiserFilePourTests();
  reinitialiserConflitsPourTests();
  reinitialiserAliasPourTests();
  await AsyncStorage.clear();
});

describe("file", () => {
  it("persiste, notifie, et se recharge apres un redemarrage", async () => {
    const vu = jest.fn();
    surChangementFile(vu);

    await ajouterMutation(maj("a"));
    expect(vu).toHaveBeenCalled();
    expect(lireFile()).toHaveLength(1);

    reinitialiserFilePourTests();
    expect(lireFile()).toEqual([]);
    await chargerFile();
    expect(lireFile()).toEqual([maj("a")]);
  });

  it("fusionne via fusionnerFile sauf pour une mutation en vol", async () => {
    await ajouterMutation(maj("a"));
    marquerEnVol(["a"]);
    await ajouterMutation(maj("b"));
    expect(lireFile().map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("retire par id et reecrit un id local", async () => {
    await ajouterMutation(maj("a", "local:x"));
    await ajouterMutation({ id: "n", type: "note", creeLe: T, livreId: "local:x", contenu: "c" });
    await reecrireLivreIdFile("local:x", "srv-1");
    expect(lireFile().every((m) => m.livreId === "srv-1")).toBe(true);

    await retirerMutations(["a"]);
    expect(lireFile().map((m) => m.id)).toEqual(["n"]);
  });

  it("ignore une valeur stockee corrompue", async () => {
    await AsyncStorage.setItem("booklist.file", "{pas du json");
    await chargerFile();
    expect(lireFile()).toEqual([]);
  });
});

describe("conflits", () => {
  it("ajoute, liste, retire, et survit au rechargement", async () => {
    await ajouterConflit({ id: "c1", type: "conflit", mutation: maj("m"), detecteLe: T });
    reinitialiserConflitsPourTests();
    await chargerConflits();
    expect(lireConflits()).toHaveLength(1);
    await retirerConflit("c1");
    expect(lireConflits()).toEqual([]);
  });
});

describe("alias", () => {
  it("resout un id local vers l'id serveur, et laisse les autres intacts", async () => {
    await ajouterAlias("local:x", "srv-1");
    expect(resoudreId("local:x")).toBe("srv-1");
    expect(resoudreId("srv-2")).toBe("srv-2");
    reinitialiserAliasPourTests();
    await chargerAlias();
    expect(resoudreId("local:x")).toBe("srv-1");
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `services/sync/storeJson.ts`**

```ts
import type { z } from "zod";

import { storage } from "@/services/storage";

export type StorePersiste<T> = {
  /** Synchronous, stable reference: what `useSyncExternalStore` reads. */
  lire(): T;
  /** Reads the disk once; later calls share the same promise. */
  charger(): Promise<T>;
  ecrire(valeur: T): Promise<void>;
  surChangement(abonne: () => void): () => void;
  reinitialiserPourTests(): void;
};

/**
 * A small persisted store: one JSON value under one key, validated on read.
 *
 * Every write goes to memory first and to disk after: the interface never waits
 * on storage, and a full or blocked storage degrades to "lost on reload", never
 * to a frozen screen. A corrupted value falls back to the default rather than
 * crashing the start-up — a queue nobody can read is worse than an empty one,
 * and the schema is what decides.
 */
export function creerStorePersiste<T>(cle: string, schema: z.ZodType<T>, defaut: T): StorePersiste<T> {
  let valeur = defaut;
  let chargement: Promise<T> | null = null;
  const abonnes = new Set<() => void>();

  const publier = () => abonnes.forEach((abonne) => abonne());

  return {
    lire: () => valeur,

    charger() {
      if (chargement === null) {
        chargement = storage.read(cle).then((brut) => {
          if (brut === null) return valeur;
          let json: unknown;
          try {
            json = JSON.parse(brut);
          } catch {
            // Corrupted store: start empty, see the note above.
            return valeur;
          }
          const parsed = schema.safeParse(json);
          if (!parsed.success) return valeur;
          valeur = parsed.data;
          publier();
          return valeur;
        });
      }
      return chargement;
    },

    async ecrire(nouvelle) {
      valeur = nouvelle;
      publier();
      await storage.write(cle, JSON.stringify(nouvelle));
    },

    surChangement(abonne) {
      abonnes.add(abonne);
      return () => {
        abonnes.delete(abonne);
      };
    },

    reinitialiserPourTests() {
      valeur = defaut;
      chargement = null;
      abonnes.clear();
    },
  };
}
```

- [ ] **Step 4: Implement `services/sync/file.ts`**

```ts
import { z } from "zod";

import { MutationLocaleSchema, type MutationLocale } from "@/domain";

import { fusionnerFile } from "./mutation";
import { creerStorePersiste } from "./storeJson";

/**
 * The mutation queue. Survives a reload; replayed in `creeLe` order by
 * `synchroniser`. Every mutating call awaits the initial load first, so an
 * enqueue that races the start-up never overwrites what the disk holds.
 */
const store = creerStorePersiste<MutationLocale[]>("booklist.file", z.array(MutationLocaleSchema), []);

/** Ids of the batch on the wire: not foldable while the server has them. */
const enVol = new Set<string>();

export const chargerFile = store.charger;
export const lireFile = store.lire;
export const surChangementFile = store.surChangement;

export async function ajouterMutation(m: MutationLocale): Promise<void> {
  await store.charger();
  await store.ecrire(fusionnerFile(store.lire(), m, enVol));
}

export async function retirerMutations(ids: readonly string[]): Promise<void> {
  await store.charger();
  await store.ecrire(store.lire().filter((m) => !ids.includes(m.id)));
}

/** Once the server has named a book created offline. */
export async function reecrireLivreIdFile(local: string, reel: string): Promise<void> {
  await store.charger();
  await store.ecrire(store.lire().map((m) => (m.livreId === local ? { ...m, livreId: reel } : m)));
}

export function marquerEnVol(ids: readonly string[]): void {
  ids.forEach((id) => enVol.add(id));
}

export function libererEnVol(ids: readonly string[]): void {
  ids.forEach((id) => enVol.delete(id));
}

export function reinitialiserFilePourTests(): void {
  store.reinitialiserPourTests();
  enVol.clear();
}
```

- [ ] **Step 5: Implement `services/sync/conflits.ts` and `alias.ts`**

`conflits.ts`:

```ts
import { z } from "zod";

import { ConflitSchema, type Conflit } from "@/domain";

import { creerStorePersiste } from "./storeJson";

/** Mutations waiting for the bookseller's arbitration. Persisted like the queue. */
const store = creerStorePersiste<Conflit[]>("booklist.conflits", z.array(ConflitSchema), []);

export const chargerConflits = store.charger;
export const lireConflits = store.lire;
export const surChangementConflits = store.surChangement;

export async function ajouterConflit(c: Conflit): Promise<void> {
  await store.charger();
  await store.ecrire([...store.lire().filter((x) => x.id !== c.id), c]);
}

export async function retirerConflit(id: string): Promise<void> {
  await store.charger();
  await store.ecrire(store.lire().filter((c) => c.id !== id));
}

export async function reecrireLivreIdConflits(local: string, reel: string): Promise<void> {
  await store.charger();
  await store.ecrire(
    store.lire().map((c) =>
      c.mutation.livreId === local ? { ...c, mutation: { ...c.mutation, livreId: reel } } : c,
    ),
  );
}

export const reinitialiserConflitsPourTests = store.reinitialiserPourTests;
```

`alias.ts`:

```ts
import { z } from "zod";

import { creerStorePersiste } from "./storeJson";

/**
 * `local:` id → server id, once a creation has been accepted. A record opened
 * on its local id keeps working after the sync without a navigation.
 */
const store = creerStorePersiste<Record<string, string>>("booklist.alias", z.record(z.string(), z.string()), {});

export const chargerAlias = store.charger;
export const surChangementAlias = store.surChangement;

export function resoudreId(id: string): string {
  return store.lire()[id] ?? id;
}

export async function ajouterAlias(local: string, reel: string): Promise<void> {
  await store.charger();
  await store.ecrire({ ...store.lire(), [local]: reel });
}

export const reinitialiserAliasPourTests = store.reinitialiserPourTests;
```

- [ ] **Step 6: Run, expect pass** — `npx jest services/sync 2>&1 | tail -10`; `npx tsc --noEmit`.

- [ ] **Step 7: Commit**

```
feat(sync): persisted queue, conflicts and alias stores

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 7: `/sync` route and optimistic cache writes

**Files:**
- Create: `services/api/sync.ts`, `services/api/__tests__/sync.test.ts`, `services/sync/cache.ts`, `services/sync/__tests__/cache.test.ts`
- Modify: `services/queryKeys.ts` (`statsKeys`)

**Interfaces:**
- Produces: `envoyerLot(lot: readonly MutationLivre[]): Promise<ReponseSync>`; `statsKeys = { all: ["stats"] }`; from `cache.ts`: `ecrireLivre(qc, id, update)`, `insererLivre(qc, livre)`, `retirerLivre(qc, id)`, `renommerLivre(qc, local, livre)`, `insererNote(qc, livreId, note)`, `remplacerNote(qc, livreId, idLocal, note)`.

- [ ] **Step 1: Failing test for the wire format**

`services/api/__tests__/sync.test.ts`:

```ts
import type { MutationLivre } from "@/domain";
import { envoyerLot } from "@/services/api/sync";

jest.mock("@/services/config", () => ({ getBaseUrl: () => "http://api.test", REQUEST_TIMEOUT_MS: 50 }));

const T = "2026-09-11T10:00:00.000Z";
const vraiFetch = global.fetch;
afterEach(() => {
  global.fetch = vraiFetch;
});

it("traduit la file au format du serveur et valide la reponse", async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ resultats: [{ id: "a", statut: "ok" }], resume: { total: 1, ok: 1, conflits: 0, erreurs: 0 }, serveurLe: T }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;

  const lot: MutationLivre[] = [
    { id: "a", type: "create", creeLe: T, livreId: "local:1", livre: { titre: "T", auteur: "A", editeur: "E", annee: 2000, lu: false } },
    { id: "b", type: "update", creeLe: T, livreId: "l-1", baseVersion: 3, champs: { titre: "X" } },
    { id: "c", type: "delete", creeLe: T, livreId: "l-2", baseVersion: 1 },
  ];
  const reponse = await envoyerLot(lot);

  expect(reponse.resultats).toEqual([{ id: "a", statut: "ok" }]);
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe("http://api.test/sync");
  expect(JSON.parse(String(init.body))).toEqual({
    mutations: [
      { id: "a", type: "create", livre: { titre: "T", auteur: "A", editeur: "E", annee: 2000, lu: false } },
      { id: "b", type: "update", baseVersion: 3, livre: { id: "l-1", titre: "X" } },
      { id: "c", type: "delete", baseVersion: 1, livreId: "l-2" },
    ],
  });
});
```

- [ ] **Step 2: Implement `services/api/sync.ts`**

```ts
import { ReponseSyncSchema, type MutationLivre, type ReponseSync } from "@/domain";

import { request } from "./client";

/** The queue's shape is ours; this is the server's. Translated here and nowhere else. */
function versFil(m: MutationLivre) {
  switch (m.type) {
    case "create":
      return { id: m.id, type: "create", livre: m.livre };
    case "update":
      return { id: m.id, type: "update", baseVersion: m.baseVersion, livre: { id: m.livreId, ...m.champs } };
    case "delete":
      return { id: m.id, type: "delete", baseVersion: m.baseVersion, livreId: m.livreId };
  }
}

/**
 * POST /sync. Goes through `request`, hence through the interceptor: a token
 * expiring mid-batch is refreshed and the same body — same ids — is replayed,
 * which the server answers with `rejeu: true` for what it already applied.
 */
export function envoyerLot(lot: readonly MutationLivre[]): Promise<ReponseSync> {
  return request("/sync", { method: "POST", body: { mutations: lot.map(versFil) }, schema: ReponseSyncSchema });
}
```

Add to `services/queryKeys.ts`: `export const statsKeys = { all: ["stats"] as const };`

- [ ] **Step 3: Failing tests for the cache writes**

`services/sync/__tests__/cache.test.ts`:

```ts
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { Book, Note, Page } from "@/domain";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import { ecrireLivre, insererLivre, insererNote, remplacerNote, renommerLivre, retirerLivre } from "@/services/sync/cache";

type ListData = InfiniteData<Page<Book>>;
const FILTRES = { limit: 20, sort: "titre", order: "asc" } as const;
const T = "2026-09-11T10:00:00.000Z";

function livre(id: string, extra: Partial<Book> = {}): Book {
  return { id, titre: id, auteur: "A", editeur: "E", annee: 2000, lu: false, favori: false, note: null, couverture: null, createdAt: T, updatedAt: T, version: 1, ...extra };
}

let client: QueryClient;
beforeEach(() => {
  client = createQueryClient();
  client.setQueryData<ListData>(bookKeys.list(FILTRES), {
    pages: [{ items: [livre("l-1"), livre("l-2")], page: 1, limit: 20, total: 2, totalPages: 1 }],
    pageParams: [1],
  });
  client.setQueryData(bookKeys.detail("l-1"), livre("l-1"));
});
afterEach(() => client.clear());

const items = () => client.getQueryData<ListData>(bookKeys.list(FILTRES))?.pages[0]?.items.map((b) => b.id);

it("insererLivre met la fiche en tete de chaque liste et en detail", () => {
  insererLivre(client, livre("local:x"));
  expect(items()).toEqual(["local:x", "l-1", "l-2"]);
  expect(client.getQueryData(bookKeys.detail("local:x"))).toMatchObject({ id: "local:x" });
});

it("ecrireLivre applique la meme transformation a la liste et au detail", () => {
  ecrireLivre(client, "l-1", (b) => ({ ...b, lu: true }));
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.lu).toBe(true);
  expect(client.getQueryData<ListData>(bookKeys.list(FILTRES))?.pages[0]?.items[0]?.lu).toBe(true);
});

it("retirerLivre enleve partout", () => {
  retirerLivre(client, "l-1");
  expect(items()).toEqual(["l-2"]);
  expect(client.getQueryData(bookKeys.detail("l-1"))).toBeUndefined();
});

it("renommerLivre remplace l'id local par la fiche serveur, notes comprises", () => {
  insererLivre(client, livre("local:x"));
  client.setQueryData<Note[]>(noteKeys.all("local:x"), [{ id: "local:n", livreId: "local:x", contenu: "c", createdAt: T }]);

  renommerLivre(client, "local:x", livre("srv-9", { version: 1 }));

  expect(items()).toEqual(["srv-9", "l-1", "l-2"]);
  expect(client.getQueryData(bookKeys.detail("srv-9"))).toMatchObject({ id: "srv-9" });
  expect(client.getQueryData<Note[]>(noteKeys.all("srv-9"))?.[0]).toMatchObject({ livreId: "srv-9" });
});

it("insererNote puis remplacerNote", () => {
  insererNote(client, "l-1", { id: "local:n", livreId: "l-1", contenu: "c", createdAt: T });
  remplacerNote(client, "l-1", "local:n", { id: "n-1", livreId: "l-1", contenu: "c", createdAt: T });
  expect(client.getQueryData<Note[]>(noteKeys.all("l-1"))?.map((n) => n.id)).toEqual(["n-1"]);
});
```

- [ ] **Step 4: Implement `services/sync/cache.ts`** (move `writeBook` out of `useToggleBook` — Task 9 deletes it there)

```ts
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type { Book, Note, Page } from "@/domain";
import { bookKeys, noteKeys } from "@/services/queryKeys";

type ListData = InfiniteData<Page<Book>>;

/**
 * Optimistic writes, in one place. The queue says what the bookseller meant;
 * these functions make the screen say it too, before any round trip, and keep
 * the lists and the record in agreement.
 *
 * A page that does not hold the book keeps its reference: the rows it renders
 * are then skipped by React.memo instead of being redrawn.
 */
function surListes(qc: QueryClient, f: (items: Book[]) => Book[] | null): void {
  qc.setQueriesData<ListData>({ queryKey: bookKeys.lists() }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page, index) => {
            const items = f(page.items);
            // Only the first page receives insertions; every page may change.
            return items === null || (index > 0 && items === page.items) ? page : { ...page, items };
          }),
        },
  );
}

export function ecrireLivre(qc: QueryClient, id: string, update: (b: Book) => Book): void {
  surListes(qc, (items) => (items.some((b) => b.id === id) ? items.map((b) => (b.id === id ? update(b) : b)) : null));
  qc.setQueryData<Book>(bookKeys.detail(id), (b) => (b === undefined ? b : update(b)));
}

export function insererLivre(qc: QueryClient, livre: Book): void {
  qc.setQueriesData<ListData>({ queryKey: bookKeys.lists() }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page, index) =>
            index === 0 && !page.items.some((b) => b.id === livre.id)
              ? { ...page, items: [livre, ...page.items], total: page.total + 1 }
              : page,
          ),
        },
  );
  qc.setQueryData<Book>(bookKeys.detail(livre.id), livre);
}

export function retirerLivre(qc: QueryClient, id: string): void {
  surListes(qc, (items) => (items.some((b) => b.id === id) ? items.filter((b) => b.id !== id) : null));
  qc.removeQueries({ queryKey: bookKeys.detail(id) });
}

/** The server has named a book created offline: same row, real identity. */
export function renommerLivre(qc: QueryClient, local: string, livre: Book): void {
  surListes(qc, (items) => (items.some((b) => b.id === local) ? items.map((b) => (b.id === local ? livre : b)) : null));
  qc.setQueryData<Book>(bookKeys.detail(livre.id), livre);

  const notes = qc.getQueryData<Note[]>(noteKeys.all(local));
  if (notes !== undefined) {
    qc.setQueryData<Note[]>(noteKeys.all(livre.id), notes.map((n) => ({ ...n, livreId: livre.id })));
  }
  qc.removeQueries({ queryKey: bookKeys.detail(local) });
}

export function insererNote(qc: QueryClient, livreId: string, note: Note): void {
  qc.setQueryData<Note[]>(noteKeys.all(livreId), (notes) => [note, ...(notes ?? [])]);
}

export function remplacerNote(qc: QueryClient, livreId: string, idLocal: string, note: Note): void {
  qc.setQueryData<Note[]>(noteKeys.all(livreId), (notes) => {
    const sans = (notes ?? []).filter((n) => n.id !== idLocal);
    return sans.some((n) => n.id === note.id) ? sans : [note, ...sans];
  });
}
```

Note: `removeQueries` on `bookKeys.detail(local)` also drops `noteKeys.all(local)` (hierarchical key) — intended, the notes were copied first.

- [ ] **Step 5: Run, expect pass** — `npx jest services/sync services/api 2>&1 | tail -10`; `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```
feat(sync): POST /sync route and shared optimistic cache writes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 8: The synchroniser

**Files:**
- Create: `services/sync/synchroniser.ts`, `services/sync/__tests__/synchroniser.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 3–7, `jetonAcces()` from `services/auth/jetons`, `listNotes`/`createNote` from `services/api/notes`, `estEnLigne` from `services/reseau`.
- Produces: `synchroniser(qc: QueryClient, options?: { force?: boolean; maintenant?: () => Date }): Promise<void>`, `planifierSync(qc): void`, `lireEtatSync(): EtatSync`, `surChangementSync(f): () => void`, `type EtatSync = { enCours: boolean; derniereSync?: string; prochaineTentative?: number }`, `TAILLE_LOT = 200`, `reinitialiserSyncPourTests()`.

- [ ] **Step 1: Failing tests**

`services/sync/__tests__/synchroniser.test.ts` (fetch mocked at the transport level so the real interceptor and the real refresh run):

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueryClient } from "@tanstack/react-query";

import type { Book, MutationLocale } from "@/domain";
import { enregistrerJetons, reinitialiserPourTests as resetJetons } from "@/services/auth/jetons";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import { reinitialiserPourTests as resetReseau, signalerPanne, surChangement } from "@/services/reseau";
import { reinitialiserAliasPourTests, resoudreId } from "@/services/sync/alias";
import { lireConflits, reinitialiserConflitsPourTests } from "@/services/sync/conflits";
import { ajouterMutation, lireFile, reinitialiserFilePourTests } from "@/services/sync/file";
import { reinitialiserSyncPourTests, synchroniser } from "@/services/sync/synchroniser";

jest.mock("@/services/config", () => ({ getBaseUrl: () => "http://api.test", REQUEST_TIMEOUT_MS: 50 }));

const T = "2026-09-11T10:00:00.000Z";
const vraiFetch = global.fetch;
let client: QueryClient;

function livre(id: string, extra: Partial<Book> = {}): Book {
  return { id, titre: id, auteur: "A", editeur: "E", annee: 2000, lu: false, favori: false, note: null, couverture: null, createdAt: T, updatedAt: T, version: 1, ...extra };
}
function reponse(status: number, body: unknown): Response {
  return { ok: status < 300, status, json: async () => body, clone() { return this; } } as unknown as Response;
}
type Appel = { url: string; method: string; body: unknown; bearer: string | undefined };
function stub(handler: (appel: Appel, index: number) => Response | Promise<Response>): Appel[] {
  const appels: Appel[] = [];
  global.fetch = jest.fn(async (url: string, init: RequestInit) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const appel = { url, method: init.method ?? "GET", body: init.body === undefined ? undefined : JSON.parse(String(init.body)), bearer: headers.Authorization };
    appels.push(appel);
    return handler(appel, appels.length - 1);
  }) as unknown as typeof fetch;
  return appels;
}

const creation: MutationLocale = { id: "m-c", type: "create", creeLe: T, livreId: "local:1", livre: { titre: "Dune", auteur: "H", editeur: "L", annee: 1965, lu: false } };
const maj: MutationLocale = { id: "m-u", type: "update", creeLe: T, livreId: "l-1", baseVersion: 1, champs: { titre: "Mien" } };

beforeEach(async () => {
  client = createQueryClient();
  await enregistrerJetons({ accessToken: "vieux", refreshToken: "r" });
});
afterEach(async () => {
  client.clear();
  global.fetch = vraiFetch;
  reinitialiserFilePourTests();
  reinitialiserConflitsPourTests();
  reinitialiserAliasPourTests();
  reinitialiserSyncPourTests();
  resetReseau();
  resetJetons();
  await AsyncStorage.clear();
});

it("envoie la file en un lot, retire ce qui est accepte, remappe l'id local", async () => {
  await ajouterMutation(creation);
  await ajouterMutation(maj);
  client.setQueryData(bookKeys.detail("local:1"), livre("local:1", { version: 0 }));

  const appels = stub(() => reponse(200, {
    resultats: [{ id: "m-c", statut: "ok", livre: livre("srv-9", { titre: "Dune" }) }, { id: "m-u", statut: "ok", livre: livre("l-1", { titre: "Mien", version: 2 }) }],
  }));

  await synchroniser(client);

  expect(appels.filter((a) => a.url.endsWith("/sync"))).toHaveLength(1);
  expect((appels[0]?.body as { mutations: unknown[] }).mutations.map((m) => (m as { id: string }).id)).toEqual(["m-c", "m-u"]);
  expect(lireFile()).toEqual([]);
  expect(resoudreId("local:1")).toBe("srv-9");
  expect(client.getQueryData(bookKeys.detail("srv-9"))).toMatchObject({ titre: "Dune" });
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.version).toBe(2);
});

it("rafraichit le jeton expire en plein lot et rejoue le meme corps avec les memes ids", async () => {
  await ajouterMutation(creation);
  const appels = stub((appel) => {
    if (appel.url.endsWith("/auth/refresh")) return reponse(200, { accessToken: "neuf", expiresIn: "120s" });
    if (appel.bearer !== "Bearer neuf") return reponse(401, { erreur: "jeton_expire" });
    return reponse(200, { resultats: [{ id: "m-c", statut: "ok", rejeu: true, livre: livre("srv-9") }] });
  });

  await synchroniser(client);

  const syncs = appels.filter((a) => a.url.endsWith("/sync"));
  expect(syncs).toHaveLength(2);
  expect(syncs[0]?.body).toEqual(syncs[1]?.body);
  expect(appels.filter((a) => a.url.endsWith("/auth/refresh"))).toHaveLength(1);
  expect(lireFile()).toEqual([]);
});

it("range un conflit a part, ecrit la version serveur dans le cache, et continue", async () => {
  await ajouterMutation(maj);
  stub(() => reponse(200, { resultats: [{ id: "m-u", statut: "conflit", serveur: livre("l-1", { titre: "Serveur", version: 4 }), versionAttendue: 4 }] }));

  await synchroniser(client);

  expect(lireFile()).toEqual([]);
  expect(lireConflits()).toEqual([expect.objectContaining({ id: "m-u", type: "conflit", versionAttendue: 4 })]);
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.titre).toBe("Serveur");
});

it("garde la file intacte et se declare hors ligne quand le serveur est injoignable", async () => {
  await ajouterMutation(maj);
  const vu: boolean[] = [];
  surChangement((v) => vu.push(v));
  stub(() => Promise.reject(new TypeError("Failed to fetch")));

  await synchroniser(client);

  expect(lireFile()).toHaveLength(1);
  expect(vu).toEqual([false]);
});

it("ne fait rien hors ligne sauf si on force", async () => {
  await ajouterMutation(maj);
  signalerPanne();
  const appels = stub(() => reponse(200, { resultats: [{ id: "m-u", statut: "ok", livre: livre("l-1") }] }));

  await synchroniser(client);
  expect(appels).toHaveLength(0);

  await synchroniser(client, { force: true });
  expect(appels).toHaveLength(1);
});

it("est a vol unique", async () => {
  await ajouterMutation(maj);
  let liberer!: (r: Response) => void;
  const appels = stub(() => new Promise<Response>((resolve) => { liberer = resolve; }));

  const a = synchroniser(client);
  const b = synchroniser(client);
  expect(a).toBe(b);
  liberer(reponse(200, { resultats: [{ id: "m-u", statut: "ok", livre: livre("l-1") }] }));
  await a;
  expect(appels).toHaveLength(1);
});

it("rejoue les notes apres les livres, sur l'id reel, sans doublon", async () => {
  await ajouterMutation(creation);
  await ajouterMutation({ id: "m-n", type: "note", creeLe: T, livreId: "local:1", contenu: "Deja la" });
  await ajouterMutation({ id: "m-n2", type: "note", creeLe: T, livreId: "local:1", contenu: "Nouvelle" });
  client.setQueryData(noteKeys.all("local:1"), [
    { id: "local:m-n", livreId: "local:1", contenu: "Deja la", createdAt: T },
    { id: "local:m-n2", livreId: "local:1", contenu: "Nouvelle", createdAt: T },
  ]);

  const appels = stub((appel) => {
    if (appel.url.endsWith("/sync")) return reponse(200, { resultats: [{ id: "m-c", statut: "ok", livre: livre("srv-9") }] });
    if (appel.method === "GET") return reponse(200, [{ id: "n-0", livreId: "srv-9", contenu: "Deja la", createdAt: T }]);
    return reponse(201, { id: "n-1", livreId: "srv-9", contenu: "Nouvelle", createdAt: T });
  });

  await synchroniser(client);

  expect(appels.filter((a) => a.method === "POST" && a.url.endsWith("/books/srv-9/notes"))).toHaveLength(1);
  expect(lireFile()).toEqual([]);
  expect(client.getQueryData<{ id: string }[]>(noteKeys.all("srv-9"))?.map((n) => n.id).sort()).toEqual(["n-0", "n-1"]);
});

it("ne tente rien sans session", async () => {
  await ajouterMutation(maj);
  resetJetons();
  const appels = stub(() => reponse(200, { resultats: [] }));
  await synchroniser(client);
  expect(appels).toHaveLength(0);
  expect(lireFile()).toHaveLength(1);
});
```

- [ ] **Step 2: Run, expect failure** — `npx jest services/sync/__tests__/synchroniser 2>&1 | tail -20`.

- [ ] **Step 3: Implement `services/sync/synchroniser.ts`**

```ts
import type { QueryClient } from "@tanstack/react-query";

import { ApiError, estIdLocal, type MutationLivre, type MutationNote } from "@/domain";
import { createNote, listNotes } from "@/services/api/notes";
import { envoyerLot } from "@/services/api/sync";
import { jetonAcces } from "@/services/auth/jetons";
import { bookKeys, statsKeys } from "@/services/queryKeys";
import { estEnLigne } from "@/services/reseau";

import { ajouterAlias, chargerAlias, resoudreId } from "./alias";
import { ecrireLivre, remplacerNote, renommerLivre, retirerLivre } from "./cache";
import { ajouterConflit, chargerConflits, reecrireLivreIdConflits } from "./conflits";
import { decider, type Decision } from "./decision";
import { chargerFile, libererEnVol, lireFile, marquerEnVol, reecrireLivreIdFile, retirerMutations } from "./file";

export const TAILLE_LOT = 200;
const DELAI_MIN_MS = 1000;
const DELAI_MAX_MS = 30_000;

export type EtatSync = { enCours: boolean; derniereSync?: string; prochaineTentative?: number };
type Options = { force?: boolean; maintenant?: () => Date };

let etat: EtatSync = { enCours: false };
let enCours: Promise<void> | null = null;
let echecs = 0;
const abonnes = new Set<() => void>();

function publier(suivant: EtatSync): void {
  etat = suivant;
  abonnes.forEach((abonne) => abonne());
}

export const lireEtatSync = (): EtatSync => etat;

export function surChangementSync(abonne: () => void): () => void {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

/** Fire-and-forget entry point for the hooks: sync now if the shop is online. */
export function planifierSync(qc: QueryClient): void {
  if (estEnLigne()) void synchroniser(qc);
}

/**
 * Replays the queue. Single-flight: a call during a run returns that run.
 *
 * Books go first, in one `/sync` batch per 200, through the interceptor —
 * which is what handles the token expiring mid-batch: the refresh happens,
 * the very same body is sent again, and the server answers `rejeu: true` for
 * what it had already applied. Notes follow on their own route once their
 * book has a real id. A transport failure keeps everything for the next
 * trigger, with a growing delay after repeated failures so a struggling
 * server is not hammered.
 */
export function synchroniser(qc: QueryClient, options: Options = {}): Promise<void> {
  if (enCours === null) {
    enCours = executer(qc, options).finally(() => {
      enCours = null;
    });
  }
  return enCours;
}

async function executer(qc: QueryClient, { force = false, maintenant = () => new Date() }: Options): Promise<void> {
  if (jetonAcces() === null) return;
  if (!force && (!estEnLigne() || (etat.prochaineTentative ?? 0) > maintenant().getTime())) return;

  await Promise.all([chargerFile(), chargerConflits(), chargerAlias()]);
  if (lireFile().length === 0) return;

  publier({ ...etat, enCours: true });
  try {
    const livres = lireFile().filter((m): m is MutationLivre => m.type !== "note");
    for (let debut = 0; debut < livres.length; debut += TAILLE_LOT) {
      await envoyerUnLot(qc, livres.slice(debut, debut + TAILLE_LOT), maintenant);
    }
    await rejouerNotes(qc, maintenant);

    echecs = 0;
    publier({ enCours: false, derniereSync: maintenant().toISOString(), prochaineTentative: undefined });
    void qc.invalidateQueries({ queryKey: statsKeys.all });
    // A refetch of the lists would drop the books still waiting under a local
    // id: the whole tree is only refetched once the queue is empty.
    void qc.invalidateQueries({ queryKey: bookKeys.all, refetchType: lireFile().length === 0 ? "active" : "none" });
  } catch (cause) {
    if (!(cause instanceof ApiError)) throw cause;
    // Network, 503, lost session: the queue is the retry mechanism. The
    // reseau signal has already been flipped by client.ts where relevant.
    echecs += 1;
    const delai = Math.min(DELAI_MAX_MS, DELAI_MIN_MS * 2 ** (echecs - 1));
    publier({ ...etat, enCours: false, prochaineTentative: maintenant().getTime() + delai });
  }
}

async function envoyerUnLot(qc: QueryClient, lot: MutationLivre[], maintenant: () => Date): Promise<void> {
  const ids = lot.map((m) => m.id);
  marquerEnVol(ids);
  try {
    const reponse = await envoyerLot(lot);
    const parId = new Map(reponse.resultats.map((r) => [r.id, r]));
    for (const m of lot) {
      await appliquer(qc, m, decider(m, parId.get(m.id), maintenant().toISOString()));
    }
  } finally {
    libererEnVol(ids);
  }
}

async function appliquer(qc: QueryClient, m: MutationLivre, d: Decision): Promise<void> {
  switch (d.action) {
    case "garder":
      return;
    case "retirer":
      await retirerMutations([m.id]);
      if (d.alias !== undefined && d.livre !== null) {
        await ajouterAlias(d.alias.local, d.alias.serveur);
        await reecrireLivreIdFile(d.alias.local, d.alias.serveur);
        await reecrireLivreIdConflits(d.alias.local, d.alias.serveur);
        renommerLivre(qc, d.alias.local, d.livre);
      } else if (m.type === "delete") {
        retirerLivre(qc, m.livreId);
      } else if (d.livre !== null) {
        const livre = d.livre;
        ecrireLivre(qc, livre.id, () => livre);
      }
      return;
    case "conflit":
    case "rejeter":
      await retirerMutations([m.id]);
      await ajouterConflit(d.conflit);
      if (d.conflit.serveur !== undefined) {
        const serveur = d.conflit.serveur;
        ecrireLivre(qc, serveur.id, () => serveur);
      } else if (estIdLocal(m.livreId)) {
        retirerLivre(qc, m.livreId);
      } else {
        void qc.invalidateQueries({ queryKey: bookKeys.detail(m.livreId) });
      }
      return;
  }
}

/**
 * Notes have no client id on the server: before sending one, the existing
 * notes are read and an identical text is taken as "already there". A note on
 * a book still waiting for its id is left for the next run.
 */
async function rejouerNotes(qc: QueryClient, maintenant: () => Date): Promise<void> {
  const notes = lireFile().filter((m): m is MutationNote => m.type === "note");
  for (const m of notes) {
    const livreId = resoudreId(m.livreId);
    if (estIdLocal(livreId)) continue;
    const idLocal = `local:${m.id}`;

    try {
      const existantes = await listNotes(livreId);
      const deja = existantes.find((n) => n.contenu === m.contenu);
      const enregistree = deja ?? (await createNote(livreId, { contenu: m.contenu }));
      await retirerMutations([m.id]);
      remplacerNote(qc, livreId, idLocal, enregistree);
    } catch (cause) {
      if (cause instanceof ApiError && cause.detail.kind === "notFound") {
        await retirerMutations([m.id]);
        await ajouterConflit({ id: m.id, type: "rejet", mutation: m, motif: "Cette fiche a ete supprimee cote serveur.", detecteLe: maintenant().toISOString() });
        continue;
      }
      throw cause;
    }
  }
}

export function reinitialiserSyncPourTests(): void {
  etat = { enCours: false };
  enCours = null;
  echecs = 0;
  abonnes.clear();
}
```

If the file exceeds 250 lines, move `appliquer` and `rejouerNotes` into `services/sync/appliquer.ts` (same signatures, exported).

- [ ] **Step 4: Run, expect pass** — `npx jest services/sync 2>&1 | tail -15`; `npx tsc --noEmit`; `rtk proxy npx expo lint 2>&1 | tail -5`.

- [ ] **Step 5: Commit**

```
feat(sync): single-flight synchroniser with idempotent replay and note dedupe

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 9: Route every write through the queue

**Files:**
- Modify: `features/books/useCreateBook.ts`, `useUpdateBook.ts`, `useToggleBook.ts`, `useDeleteBook.ts`, `useBook.ts`, `features/notes/useCreateNote.ts`, `useNotes.ts`, `features/books/BookList.tsx`, `BookRecord.tsx`, `features/books/EditBook.tsx`
- Create: `features/sync/useIdReel.ts`, `features/sync/__tests__/useIdReel.test.tsx`
- Modify tests: `features/books/__tests__/useToggleBook.test.tsx`, `features/notes/__tests__/useCreateNote.test.tsx`

**Interfaces:**
- Consumes: `ajouterMutation`, `planifierSync`, `nouvelId`, `nouvelIdLocal`, `livreDepuisCreation`, `noteDepuisMutation`, cache writes, `resoudreId`/`surChangementAlias`.
- Produces: `useIdReel(id: string): string`; `useDeleteBook().scheduleDelete(id: string)` unchanged signature (reads the version from the cache); `useToggleBook()` no longer exposes `toggleRefusalMessage`; `useCreateBook().mutateAsync(draft)` resolves to the local `Book`.

- [ ] **Step 1: `features/sync/useIdReel.ts` + test**

```ts
import { useSyncExternalStore } from "react";

import { resoudreId, surChangementAlias } from "@/services/sync/alias";

/**
 * The server id behind a route parameter that may still be a `local:` one.
 * Re-renders the screen the moment the sync names the book.
 */
export function useIdReel(id: string): string {
  return useSyncExternalStore(
    surChangementAlias,
    () => resoudreId(id),
    () => resoudreId(id),
  );
}
```

Test `features/sync/__tests__/useIdReel.test.tsx`:

```ts
import { act, renderHook } from "@testing-library/react-native";

import { ajouterAlias, reinitialiserAliasPourTests } from "@/services/sync/alias";
import { useIdReel } from "@/features/sync/useIdReel";

afterEach(reinitialiserAliasPourTests);

it("suit l'alias des qu'il est connu", async () => {
  const { result } = renderHook(() => useIdReel("local:x"));
  expect(result.current).toBe("local:x");
  await act(() => ajouterAlias("local:x", "srv-1"));
  expect(result.current).toBe("srv-1");
});
```

- [ ] **Step 2: `useBook.ts` and `useNotes.ts` resolve the id and never fetch a local one**

`useBook.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { estIdLocal } from "@/domain";
import { useIdReel } from "@/features/sync/useIdReel";
import { getBook } from "@/services/api/books";
import { bookKeys } from "@/services/queryKeys";

/**
 * A single book record. A `local:` id has nothing to fetch: the record lives
 * in the cache, written at creation, and the query is left disabled — TanStack
 * still serves cached data for a disabled query.
 */
export function useBook(id: string) {
  const reel = useIdReel(id);

  return useQuery({
    queryKey: bookKeys.detail(reel),
    queryFn: ({ signal }) => getBook(reel, signal),
    enabled: reel !== "" && !estIdLocal(reel),
  });
}
```

`useNotes.ts`: same pattern — `const reel = useIdReel(bookId);`, key `noteKeys.all(reel)`, `queryFn: listNotes(reel, signal)`, `enabled: reel !== "" && !estIdLocal(reel)`. For a disabled query with no cache, `data` is `undefined` and `isPending` true: `NoteSection` must treat `estIdLocal(bookId) && query.data === undefined` as an empty list — add `const notes = query.data ?? (estIdLocal(bookId) ? [] : undefined)` and show the skeleton only when `notes === undefined && query.isPending`.

- [ ] **Step 3: `useCreateBook.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Book, BookDraft, MutationLocale } from "@/domain";
import { ajouterMutation } from "@/services/sync/file";
import { insererLivre } from "@/services/sync/cache";
import { livreDepuisCreation, nouvelId, nouvelIdLocal } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

/**
 * Creation of a book: queued, shown at once under a local id, sent by the
 * synchroniser. The same path online and offline — a 503 from degraded mode
 * is then just a later retry with the same mutation id, never a duplicate.
 */
export function useCreateBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: BookDraft): Promise<Book> => {
      const maintenant = new Date().toISOString();
      const mutation: MutationLocale = {
        id: nouvelId(),
        type: "create",
        creeLe: maintenant,
        livreId: nouvelIdLocal(),
        livre: draft,
      };
      const livre = livreDepuisCreation(mutation, maintenant);
      insererLivre(queryClient, livre);
      await ajouterMutation(mutation);
      planifierSync(queryClient);
      return livre;
    },
  });
}
```

- [ ] **Step 4: `useUpdateBook.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { estIdLocal, type BookDraft } from "@/domain";
import { ecrireLivre } from "@/services/sync/cache";
import { ajouterMutation } from "@/services/sync/file";
import { nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

export type UpdateBookInput = {
  draft: BookDraft;
  /** Version read on the loaded record; goes out as `baseVersion` to detect a conflict. */
  version: number;
};

/**
 * Correction of a record: queued with the version the bookseller saw. If a
 * colleague saved in the meantime, the sync brings back a conflict for the
 * merge screen instead of overwriting their work. A book still local has no
 * server version: the update folds into its creation.
 */
export function useUpdateBook(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ draft, version }: UpdateBookInput) => {
      ecrireLivre(queryClient, id, (book) => ({ ...book, ...draft }));
      await ajouterMutation({
        id: nouvelId(),
        type: "update",
        creeLe: new Date().toISOString(),
        livreId: id,
        baseVersion: estIdLocal(id) ? undefined : version,
        champs: draft,
      });
      planifierSync(queryClient);
    },
  });
}
```

`EditBook.tsx`: no change needed (`update.mutateAsync({ draft, version: book.version })` still fits).

- [ ] **Step 5: `useToggleBook.ts`**

Replace the file body (keep `BookToggleChanges`, `BookToggleInput` types; delete `writeBook` and `toggleRefusalMessage`):

```ts
/**
 * Coup de coeur and read status: applied on the spot, queued without a
 * version. A PATCH on one boolean expresses an intention that no title
 * correction contradicts; asking the server to check the version would only
 * produce conflicts the bookseller could do nothing about.
 */
export function useToggleBook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, changes }: BookToggleInput) => {
      ecrireLivre(queryClient, id, (book) => ({ ...book, ...changes }));
      await ajouterMutation({ id: nouvelId(), type: "update", creeLe: new Date().toISOString(), livreId: id, champs: changes });
      planifierSync(queryClient);
    },
  });
}
```

In `BookList.tsx` and `BookRecord.tsx`: remove the `toggleRefusalMessage` import and the `<Notice …toggle.isError…>` blocks (and the now-unused `Notice` import in `BookList.tsx`).

- [ ] **Step 6: `useDeleteBook.ts`**

Replace `run: () => deleteBook(id)` with:

```ts
        run: async () => {
          const version = queryClient.getQueryData<Book>(bookKeys.detail(id))?.version;
          await ajouterMutation({
            id: nouvelId(),
            type: "delete",
            creeLe: new Date().toISOString(),
            livreId: id,
            baseVersion: version === undefined || version === 0 ? undefined : version,
          });
          planifierSync(queryClient);
        },
```

In `onSettled` success branch replace `void queryClient.invalidateQueries({ queryKey: bookKeys.lists() });` with `void queryClient.invalidateQueries({ queryKey: bookKeys.lists(), refetchType: "none" });` (the row is already gone; a refetch now would resurrect it until the sync). Drop the `deleteBook` import.

- [ ] **Step 7: `useCreateNote.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { LOCAL_ID_PREFIX, type Note, type NoteDraft } from "@/domain";
import { insererNote } from "@/services/sync/cache";
import { ajouterMutation } from "@/services/sync/file";
import { noteDepuisMutation, nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

export { LOCAL_ID_PREFIX };

/** A note still waiting for its server identifier. */
export function isLocalNote(note: Note): boolean {
  return note.id.startsWith(LOCAL_ID_PREFIX);
}

/**
 * Writing a reading note: queued and shown at once, marked as sending until
 * the synchroniser replaces it with the recorded one. Cutting the network in
 * the middle changes nothing for the bookseller: the note is on disk.
 */
export function useCreateNote(bookId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: NoteDraft): Promise<Note> => {
      const mutation = { id: nouvelId(), type: "note" as const, creeLe: new Date().toISOString(), livreId: bookId, contenu: draft.contenu };
      const note = noteDepuisMutation(mutation);
      insererNote(queryClient, bookId, note);
      await ajouterMutation(mutation);
      planifierSync(queryClient);
      return note;
    },
  });
}
```

- [ ] **Step 8: Update the two hook tests**

`features/books/__tests__/useToggleBook.test.tsx`: keep `seed`/`listed` helpers; replace the three API-centred tests with:

```ts
import { lireFile, reinitialiserFilePourTests } from "@/services/sync/file";
// afterEach: client.clear(); reinitialiserFilePourTests(); await AsyncStorage.clear();

it("applies the change to the list and the record, and queues one update", async () => {
  const { client, result } = setup();
  await act(async () => { result.current.mutate({ id: "l-1", changes: { favori: true } }); });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(listed(client, "l-1")?.favori).toBe(true);
  expect(client.getQueryData<Book>(bookKeys.detail("l-1"))?.favori).toBe(true);
  expect(lireFile()).toEqual([expect.objectContaining({ type: "update", livreId: "l-1", champs: { favori: true } })]);
  expect(lireFile()[0]).not.toHaveProperty("baseVersion");
});

it("folds two toggles on the same book into one queued update", async () => {
  const { result } = setup();
  await act(async () => { result.current.mutate({ id: "l-1", changes: { favori: true } }); });
  await act(async () => { result.current.mutate({ id: "l-1", changes: { lu: true } }); });
  await waitFor(() => expect(lireFile()).toHaveLength(1));
  expect(lireFile()[0]).toMatchObject({ champs: { favori: true, lu: true } });
});
```

(`setup()` = `renderHook(useToggleBook, { wrapper })` with a seeded client, as the file already does; stub `global.fetch` to reject so `planifierSync` finds no server — `signalerPanne` then keeps the queue.)

`features/notes/__tests__/useCreateNote.test.tsx`: the `useCreateNote` describe becomes two tests — "shows the note first, marked as local, and queues it" (cache has 2 notes, first `isLocalNote`, `lireFile()` has one `note` mutation with the text) and "keeps the note when the server is unreachable" (fetch rejects; after `mutate`, the note is still in the cache and in `lireFile()`). The `useDeleteNote` tests stay as they are.

- [ ] **Step 9: Run everything** — `npx jest 2>&1 | tail -12`; `npx tsc --noEmit`; `rtk proxy npx expo lint 2>&1 | tail -5`. Expected: green, 0 errors.

- [ ] **Step 10: Commit**

```
feat(sync): every write goes through the queue, local ids resolve in place

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 10: Sync indicator, bootstrap, logout guard

**Files:**
- Create: `features/sync/useSync.ts`, `features/sync/SyncBootstrap.tsx`, `features/sync/IndicateurSync.tsx`, `features/sync/index.ts`, `features/sync/__tests__/IndicateurSync.test.tsx`
- Modify: `features/session/HeaderActions.tsx`, `features/session/CompteMenu.tsx`, `app/(app)/_layout.tsx`

**Interfaces:**
- Produces: `useSync(): { enLigne, enAttente, enCours, conflits, derniereSync?, synchroniser(): Promise<void> }`; `IndicateurSync(props: { enLigne: boolean; enAttente: number; enCours: boolean; conflits: number; onSynchroniser: () => void; onConflits: () => void })`; `IndicateurSyncConnecte()`; `SyncBootstrap()`.

- [ ] **Step 1: Failing component test**

`features/sync/__tests__/IndicateurSync.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react-native";

import { IndicateurSync } from "@/features/sync/IndicateurSync";
import { renderWithTheme } from "@/test-utils/render";

const base = { enLigne: true, enAttente: 0, enCours: false, conflits: 0, onSynchroniser: jest.fn(), onConflits: jest.fn() };

it("dit que tout est synchronise", () => {
  renderWithTheme(<IndicateurSync {...base} />);
  expect(screen.getByLabelText("En ligne, tout est synchronise")).toBeTruthy();
});

it("affiche Hors ligne en toutes lettres", () => {
  renderWithTheme(<IndicateurSync {...base} enLigne={false} />);
  expect(screen.getByText("Hors ligne")).toBeTruthy();
});

it("compte les modifications en attente et lance la synchronisation au toucher", () => {
  const onSynchroniser = jest.fn();
  renderWithTheme(<IndicateurSync {...base} enAttente={3} onSynchroniser={onSynchroniser} />);
  fireEvent.press(screen.getByLabelText("3 modifications en attente. Synchroniser"));
  expect(onSynchroniser).toHaveBeenCalled();
});

it("fait passer le conflit avant l'attente et mene aux conflits", () => {
  const onConflits = jest.fn();
  renderWithTheme(<IndicateurSync {...base} enAttente={2} conflits={1} onConflits={onConflits} />);
  fireEvent.press(screen.getByLabelText("1 conflit a traiter"));
  expect(onConflits).toHaveBeenCalled();
});

it("montre la synchronisation en cours", () => {
  renderWithTheme(<IndicateurSync {...base} enAttente={1} enCours />);
  expect(screen.getByLabelText("Synchronisation en cours")).toBeTruthy();
});
```

- [ ] **Step 2: Implement `IndicateurSync.tsx`**

```tsx
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Badge, IconButton, Text } from "react-native-paper";

import { space, useAppTheme } from "@/theme";

import { useSync } from "./useSync";

type Props = {
  enLigne: boolean;
  enAttente: number;
  enCours: boolean;
  conflits: number;
  onSynchroniser: () => void;
  onConflits: () => void;
};

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/**
 * Always in the header: the bookseller must never wonder whether what they
 * typed has left the till. Conflicts outrank pending changes, which outrank the
 * bare network state — the most urgent thing is the one shown.
 */
export function IndicateurSync({ enLigne, enAttente, enCours, conflits, onSynchroniser, onConflits }: Props) {
  const { colors } = useAppTheme();

  if (conflits > 0) {
    const libelle = `${pluriel(conflits, "conflit")} a traiter`;
    return (
      <View style={styles.row}>
        <IconButton accessibilityLabel={libelle} accessibilityRole="button" icon="alert-circle" iconColor={colors.destructive} onPress={onConflits} />
        <Badge style={styles.badge}>{conflits}</Badge>
      </View>
    );
  }

  if (enCours) {
    return (
      <View accessibilityLabel="Synchronisation en cours" style={styles.row}>
        <ActivityIndicator color={colors.accent} size={20} />
      </View>
    );
  }

  if (enAttente > 0) {
    const libelle = `${pluriel(enAttente, "modification")} en attente. Synchroniser`;
    return (
      <View style={styles.row}>
        <IconButton accessibilityLabel={libelle} accessibilityRole="button" icon="cloud-upload-outline" onPress={onSynchroniser} />
        <Badge style={styles.badge}>{enAttente}</Badge>
      </View>
    );
  }

  if (!enLigne) {
    return (
      <View accessibilityLabel="Hors ligne" style={styles.row}>
        <IconButton accessibilityLabel="Hors ligne" icon="cloud-off-outline" />
        <Text variant="labelMedium">Hors ligne</Text>
      </View>
    );
  }

  return <IconButton accessibilityLabel="En ligne, tout est synchronise" icon="cloud-check-outline" />;
}

/** Bound to the stores; renders nothing for a reader account (nothing to sync). */
export function IndicateurSyncConnecte() {
  const sync = useSync();
  const router = useRouter();

  return (
    <IndicateurSync
      enLigne={sync.enLigne}
      enAttente={sync.enAttente}
      enCours={sync.enCours}
      conflits={sync.conflits}
      onSynchroniser={() => void sync.synchroniser()}
      onConflits={() => router.push("/conflits")}
    />
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", paddingRight: space.xs },
  badge: { position: "absolute", right: 0, top: 4 },
});
```

Note: `"/conflits"` is typed only after Task 12 creates the route; until then use `router.push("/conflits" as never)`? No — order the work: create the two route files as stubs in this task (`export default function() { return null; }`) and fill them in Task 12, then run `rtk proxy npx expo export --platform web --output-dir dist` to regenerate typed routes.

- [ ] **Step 3: `useSync.ts` and `SyncBootstrap.tsx`**

```ts
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";

import { estEnLigne, surChangement } from "@/services/reseau";
import { lireConflits, surChangementConflits } from "@/services/sync/conflits";
import { lireFile, surChangementFile } from "@/services/sync/file";
import { lireEtatSync, surChangementSync, synchroniser } from "@/services/sync/synchroniser";

export function useSync() {
  const queryClient = useQueryClient();
  const file = useSyncExternalStore(surChangementFile, lireFile, lireFile);
  const conflits = useSyncExternalStore(surChangementConflits, lireConflits, lireConflits);
  const enLigne = useSyncExternalStore(surChangement, estEnLigne, estEnLigne);
  const etat = useSyncExternalStore(surChangementSync, lireEtatSync, lireEtatSync);

  const lancer = useCallback(() => synchroniser(queryClient, { force: true }), [queryClient]);

  return {
    enLigne,
    enAttente: file.length,
    conflits: conflits.length,
    enCours: etat.enCours,
    derniereSync: etat.derniereSync,
    synchroniser: lancer,
  };
}
```

`SyncBootstrap.tsx`:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { surChangement } from "@/services/reseau";
import { chargerAlias } from "@/services/sync/alias";
import { chargerConflits } from "@/services/sync/conflits";
import { chargerFile } from "@/services/sync/file";
import { lireEtatSync, surChangementSync, synchroniser } from "@/services/sync/synchroniser";

/**
 * Mounted once behind the login for an editor: loads the stores, syncs on
 * start-up, on every return of the network, and again when a failed run has
 * scheduled its retry. Renders nothing.
 */
export function SyncBootstrap() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let actif = true;
    void Promise.all([chargerFile(), chargerConflits(), chargerAlias()]).then(() => {
      if (actif) void synchroniser(queryClient);
    });
    return () => {
      actif = false;
    };
  }, [queryClient]);

  useEffect(() => surChangement((enLigne) => { if (enLigne) void synchroniser(queryClient); }), [queryClient]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arreter = surChangementSync(() => {
      const { prochaineTentative } = lireEtatSync();
      if (timer !== undefined) clearTimeout(timer);
      if (prochaineTentative === undefined) return;
      timer = setTimeout(() => void synchroniser(queryClient), Math.max(0, prochaineTentative - Date.now()));
    });
    return () => {
      arreter();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [queryClient]);

  return null;
}
```

`features/sync/index.ts`: export `IndicateurSync`, `IndicateurSyncConnecte`, `SyncBootstrap`, `useSync`, `useIdReel`.

- [ ] **Step 4: Wire it**

`features/session/HeaderActions.tsx`: render `<IndicateurSyncConnecte />` before `<CompteMenuConnecte />` (import from `@/features/sync`).

`app/(app)/_layout.tsx`: inside the connected branch, wrap the `Stack` in a fragment and add `{peutEcrire ? <SyncBootstrap /> : null}` (get `peutEcrire` from `useSession()`); register `<Stack.Screen name="conflits/index" options={{ title: "Conflits a traiter" }} />`, `<Stack.Screen name="conflits/[id]" options={{ title: "Fusionner la fiche" }} />`, `<Stack.Screen name="stats" options={{ title: "Tableau de bord" }} />`. Create stub route files `app/(app)/conflits/index.tsx`, `app/(app)/conflits/[id].tsx`, `app/(app)/stats.tsx` each `export default function Screen() { return null; }` (filled in Tasks 12–13).

`features/session/SessionProvider.tsx`: `oublier` keeps `queryClient.clear()` — under `PersistQueryClientProvider` the cleared cache is persisted as empty on the next throttle tick, so nothing of the previous session survives on disk. The queue, conflicts and aliases stores are deliberately **not** cleared (see spec 4.5).

`features/session/CompteMenu.tsx`: `CompteMenuConnecte` reads `useSync().enAttente`; when `> 0`, `onDeconnexion` opens a Paper `Dialog` (title "Des modifications attendent", body `${n} modification(s) ne sont pas encore synchronisees. Elles seront envoyees a la prochaine connexion sur ce poste.`, actions "Rester" / "Se deconnecter quand meme" → `session.deconnexion()`). Also add a `Menu.Item leadingIcon="chart-box-outline" title="Tableau de bord"` that pushes `/stats` (prop `onTableauDeBord`).

- [ ] **Step 5: Run** — `rtk proxy npx expo export --platform web --output-dir dist 2>&1 | tail -3` (typed routes), `npx tsc --noEmit`, `npx jest features 2>&1 | tail -10`, lint.

- [ ] **Step 6: Commit**

```
feat(sync): always-visible indicator, bootstrap on login and network return

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 11: Offline reading and no input loss

**Files:**
- Create: `components/ui/OfflineBanner.tsx`, `features/sync/useBrouillon.ts`, `features/sync/__tests__/useBrouillon.test.tsx`
- Modify: `features/books/BookList.tsx`, `features/books/BookRecord.tsx`, `features/notes/NoteSection.tsx`, `components/notes/NoteComposer.tsx`, `features/books/useBookForm.ts`, `features/books/CreateBook.tsx`, `features/books/EditBook.tsx`, `components/__tests__/NoteComposer.test.tsx`

**Interfaces:**
- Produces: `OfflineBanner({ visible: boolean })`; `useBrouillon(cle: string): { valeur: string | undefined; ecrire(v: string): void; effacer(): void }`; `NoteComposer` gains `brouillonCle?: string`; `useBookForm` gains `brouillonCle?: string`.

- [ ] **Step 1: `OfflineBanner.tsx`**

```tsx
import { Banner } from "react-native-paper";

/**
 * Laid above data that is still on screen: the bookseller keeps reading what
 * the till knew, and is told why nothing refreshes. Never replaces content.
 */
export function OfflineBanner({ visible }: { visible: boolean }) {
  return (
    <Banner visible={visible} icon="cloud-off-outline">
      Hors ligne. Vous consultez les donnees du cache ; elles seront rafraichies au retour du reseau.
    </Banner>
  );
}
```

In `BookList.tsx`, replace the "error while data is displayed" block:

```tsx
      {query.isError && books.length > 0 ? (
        enLigne ? (
          <ErrorState banner error={query.error} onRetry={() => void query.refetch()} />
        ) : (
          <OfflineBanner visible />
        )
      ) : null}
```

with `const { enLigne } = useSync();`. Same in `BookRecord.tsx` and `NoteSection.tsx`: an error with `query.data !== undefined` shows `<OfflineBanner visible={!enLigne} />` (online errors keep the existing banner); the full-screen `ErrorState` only when there is no data.

- [ ] **Step 2: Failing test for the draft hook**

`features/sync/__tests__/useBrouillon.test.tsx`:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useBrouillon } from "@/features/sync/useBrouillon";

afterEach(() => AsyncStorage.clear());

it("restaure un brouillon apres un rechargement et l'efface a l'envoi", async () => {
  jest.useFakeTimers();
  const premier = renderHook(() => useBrouillon("note:l-1"));
  act(() => premier.result.current.ecrire("En cours de red"));
  await act(async () => { jest.advanceTimersByTime(400); });
  jest.useRealTimers();
  await waitFor(async () => expect(await AsyncStorage.getItem("booklist.brouillon.note:l-1")).toBe("En cours de red"));

  const second = renderHook(() => useBrouillon("note:l-1"));
  await waitFor(() => expect(second.result.current.valeur).toBe("En cours de red"));

  await act(async () => second.result.current.effacer());
  expect(await AsyncStorage.getItem("booklist.brouillon.note:l-1")).toBeNull();
});
```

- [ ] **Step 3: Implement `useBrouillon.ts`**

```ts
import { useCallback, useEffect, useState } from "react";

import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { storage } from "@/services/storage";

const DELAI_MS = 300;

/**
 * What the bookseller is typing, written to disk as they type. A page reload
 * — or the till's browser crashing — in the middle of a note finds the text
 * where it was. `valeur` is undefined until the disk has been read, so a form
 * can tell "nothing saved" from "not read yet".
 */
export function useBrouillon(cle: string) {
  const cleStockage = `booklist.brouillon.${cle}`;
  const [valeur, setValeur] = useState<string | undefined>(undefined);

  useEffect(() => {
    let actif = true;
    void storage.read(cleStockage).then((lu) => {
      if (actif) setValeur(lu ?? "");
    });
    return () => {
      actif = false;
    };
  }, [cleStockage]);

  const persister = useDebouncedCallback((texte: string) => {
    void (texte === "" ? storage.remove(cleStockage) : storage.write(cleStockage, texte));
  }, DELAI_MS);

  const ecrire = useCallback((texte: string) => persister.run(texte), [persister]);

  const effacer = useCallback(() => {
    persister.cancel();
    setValeur("");
    return storage.remove(cleStockage);
  }, [persister, cleStockage]);

  return { valeur, ecrire, effacer };
}
```

- [ ] **Step 4: Wire the note composer**

`NoteComposer.tsx`: new optional prop `brouillonCle?: string`. Extract the current body into `NoteComposerControle({ initial, onChange, onSubmit, sending })` and make `NoteComposer` a thin wrapper: when `brouillonCle` is given, `const brouillon = useBrouillon(brouillonCle)`; render nothing until `brouillon.valeur !== undefined`, then `<NoteComposerControle initial={brouillon.valeur} onChange={brouillon.ecrire} onSubmit={async (c) => { const ok = await onSubmit(c); if (ok) await brouillon.effacer(); return ok; }} />`. Without the prop, `initial=""` and `onChange` is a no-op — the existing tests keep passing. `NoteSection` passes `brouillonCle={`note:${bookId}`}`.

Add to `components/__tests__/NoteComposer.test.tsx`: "restaure le brouillon" — seed `AsyncStorage.setItem("booklist.brouillon.note:l-1", "Deja tape")`, render with `brouillonCle="note:l-1"`, expect the field to have value `Deja tape`.

- [ ] **Step 5: Wire the book form**

`useBookForm.ts`: option `brouillonCle?: string`. When given: `const brouillon = useBrouillon(brouillonCle)`; an effect on `brouillon.valeur` — once defined, non-empty, and `!form.formState.isDirty` — parses it (`JSON.parse` in a try; a corrupted draft is ignored with a comment) and calls `form.reset(values, { keepDefaultValues: true })`; a `form.watch` subscription serialises the values to `brouillon.ecrire(JSON.stringify(values))`; `submit` calls `brouillon.effacer()` after `onSaved()`. `CreateBook` passes `brouillonCle="livre:new"`; `EditBook`'s `LoadedForm` passes `` `livre:${book.id}` ``.

- [ ] **Step 6: Run** — `npx jest 2>&1 | tail -10`, `npx tsc --noEmit`, lint.

- [ ] **Step 7: Commit**

```
feat(offline): cache banner while offline, drafts survive a reload

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 12: Conflict screens — assisted merge

**Files:**
- Create: `features/sync/useConflits.ts`, `features/sync/EcranConflits.tsx`, `features/sync/EcranFusion.tsx`, `features/sync/__tests__/EcranFusion.test.tsx`
- Modify: `app/(app)/conflits/index.tsx`, `app/(app)/conflits/[id].tsx` (replace the stubs), `features/sync/index.ts`

**Interfaces:**
- Consumes: `champsEnConflit`, `choixInitial`, `fusionner`, `afficherValeur`, `LIBELLES_CHAMPS`, conflict store, `ajouterMutation`, `ecrireLivre`, `planifierSync`, `useBook`.
- Produces: `useConflits(): { conflits: Conflit[]; appliquerFusion(c, choix): Promise<void>; garderServeur(c): Promise<void>; supprimerQuandMeme(c): Promise<void>; abandonner(c): Promise<void>; recopier(c): Promise<void> }`; `EcranFusion({ conflit, serveur, onAppliquer, onGarderServeur, onSupprimer, onAbandonner, onRecopier })` pure.

- [ ] **Step 1: Failing test for the merge screen**

`features/sync/__tests__/EcranFusion.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react-native";

import type { Book, Conflit } from "@/domain";
import { EcranFusion } from "@/features/sync/EcranFusion";
import { renderWithTheme } from "@/test-utils/render";

const T = "2026-09-11T10:00:00.000Z";
const serveur: Book = { id: "l-1", titre: "Modifie par le serveur", auteur: "A", editeur: "E", annee: 2000, lu: true, favori: false, note: null, couverture: null, createdAt: T, updatedAt: T, version: 4 };
const conflit: Conflit = {
  id: "m", type: "conflit", detecteLe: T, serveur, versionAttendue: 4,
  mutation: { id: "m", type: "update", creeLe: T, livreId: "l-1", baseVersion: 3, champs: { titre: "Mon titre", lu: false } },
};
const actions = { onAppliquer: jest.fn(), onGarderServeur: jest.fn(), onSupprimer: jest.fn(), onAbandonner: jest.fn(), onRecopier: jest.fn() };

it("montre les deux versions champ par champ et applique la fusion choisie", () => {
  renderWithTheme(<EcranFusion conflit={conflit} serveur={serveur} {...actions} />);

  expect(screen.getByText("Cette fiche a ete modifiee par un collegue")).toBeTruthy();
  expect(screen.getByText("Mon titre")).toBeTruthy();
  expect(screen.getByText("Modifie par le serveur")).toBeTruthy();

  // Keep the server's read status, my title.
  fireEvent.press(screen.getByLabelText("Statut de lecture : version serveur"));
  fireEvent.press(screen.getByRole("button", { name: "Appliquer la fusion" }));

  expect(actions.onAppliquer).toHaveBeenCalledWith({ titre: "locale", lu: "serveur" });
});

it("propose de garder la version serveur", () => {
  renderWithTheme(<EcranFusion conflit={conflit} serveur={serveur} {...actions} />);
  fireEvent.press(screen.getByRole("button", { name: "Garder la version serveur" }));
  expect(actions.onGarderServeur).toHaveBeenCalled();
});

it("pour une suppression, demande si on supprime quand meme", () => {
  const suppression: Conflit = { ...conflit, mutation: { id: "m", type: "delete", creeLe: T, livreId: "l-1", baseVersion: 3 } };
  renderWithTheme(<EcranFusion conflit={suppression} serveur={serveur} {...actions} />);
  fireEvent.press(screen.getByRole("button", { name: "Supprimer quand meme" }));
  expect(actions.onSupprimer).toHaveBeenCalled();
});

it("pour un rejet, montre la saisie et propose de la recopier", () => {
  const rejet: Conflit = { id: "r", type: "rejet", detecteLe: T, motif: "La saisie a ete refusee par le serveur.", champs: { annee: "annee invalide" },
    mutation: { id: "r", type: "create", creeLe: T, livreId: "local:1", livre: { titre: "X", auteur: "Y", editeur: "Z", annee: 1000, lu: false } } };
  renderWithTheme(<EcranFusion conflit={rejet} serveur={undefined} {...actions} />);
  expect(screen.getByText(/annee invalide/)).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Recopier dans un nouveau formulaire" }));
  expect(actions.onRecopier).toHaveBeenCalled();
});
```

- [ ] **Step 2: Implement `EcranFusion.tsx`** (pure; ≤ 250 lines — split the row into `LigneFusionRow` in the same file)

Structure:
- `type Props = { conflit: Conflit; serveur: Book | undefined; onAppliquer(choix: Partial<Record<ChampFusion, Choix>>): void; onGarderServeur(): void; onSupprimer(): void; onAbandonner(): void; onRecopier(): void }`.
- `type === "rejet"` → `Text headlineSmall` "Le serveur a refuse cette saisie", `Text` motif, list of `champs` entries `${LIBELLES_CHAMPS[champ] ?? champ} : ${message}`, the local values (`champsEnConflit` needs a server book: for a rejet render the mutation's own fields via a small `valeursLocales(mutation)` helper returning `[champ, valeur][]`), buttons **Recopier dans un nouveau formulaire** and **Abandonner**.
- `mutation.type === "delete"` → title "Cette fiche a ete modifiee depuis votre demande de suppression", server title/author, buttons **Supprimer quand meme** (destructive colour) / **Conserver la fiche** (→ `onAbandonner`).
- otherwise (`update` / `create` conflict; `serveur` may be `undefined` while loading → show `ActivityIndicator`) → title "Cette fiche a ete modifiee par un collegue", intro `Choisissez, champ par champ, la version a conserver.`, `lignes = champsEnConflit(mutation, serveur)`, `useState(choixInitial(lignes))`; one `LigneFusionRow` per line: label (`LIBELLES_CHAMPS[champ]`), two `RadioButton.Item`s in a row with `label={afficherValeur(champ, ligne.locale)}` / server value, `accessibilityLabel={`${LIBELLES_CHAMPS[champ]} : votre version`}` / `: version serveur`, `status` bound to `choix[champ] ?? "serveur"`; rows where `!differe` render as plain text "identique". Footer: preview `Text` "Resultat : {titre fusionne}" when `titre` is among lines; buttons **Appliquer la fusion** (`onAppliquer(choix)`) and **Garder la version serveur**.

- [ ] **Step 3: `useConflits.ts`**

```ts
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useSyncExternalStore } from "react";

import { estIdLocal, type ChampsLivre, type Conflit } from "@/domain";
import { bookKeys } from "@/services/queryKeys";
import { storage } from "@/services/storage";
import { ecrireLivre } from "@/services/sync/cache";
import { lireConflits, retirerConflit, surChangementConflits } from "@/services/sync/conflits";
import { ajouterMutation } from "@/services/sync/file";
import { champsEnConflit, fusionner, type ChampFusion, type Choix } from "@/services/sync/fusion";
import { nouvelId } from "@/services/sync/mutation";
import { planifierSync } from "@/services/sync/synchroniser";

/**
 * The bookseller's verdicts on a conflict. Each one ends the conflict and, when
 * something must reach the server, queues a fresh mutation carrying the
 * version the server announced — so the next sync is accepted, or comes back
 * as a new conflict if a colleague was faster again.
 */
export function useConflits() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const conflits = useSyncExternalStore(surChangementConflits, lireConflits, lireConflits);

  const terminer = useCallback(async (c: Conflit) => {
    await retirerConflit(c.id);
    if (!estIdLocal(c.mutation.livreId)) {
      void queryClient.invalidateQueries({ queryKey: bookKeys.detail(c.mutation.livreId) });
    }
  }, [queryClient]);

  const envoyer = useCallback(async (c: Conflit, champs: ChampsLivre) => {
    const livreId = c.mutation.livreId;
    ecrireLivre(queryClient, livreId, (b) => ({ ...b, ...champs }));
    await ajouterMutation({ id: nouvelId(), type: "update", creeLe: new Date().toISOString(), livreId, baseVersion: c.versionAttendue, champs });
    await retirerConflit(c.id);
    planifierSync(queryClient);
  }, [queryClient]);

  const appliquerFusion = useCallback(async (c: Conflit, choix: Partial<Record<ChampFusion, Choix>>) => {
    if (c.serveur === undefined || c.mutation.type === "note") return terminer(c);
    const champs = fusionner(champsEnConflit(c.mutation, c.serveur), choix);
    return Object.keys(champs).length === 0 ? terminer(c) : envoyer(c, champs);
  }, [envoyer, terminer]);

  const supprimerQuandMeme = useCallback(async (c: Conflit) => {
    await ajouterMutation({ id: nouvelId(), type: "delete", creeLe: new Date().toISOString(), livreId: c.mutation.livreId, baseVersion: c.versionAttendue });
    await retirerConflit(c.id);
    planifierSync(queryClient);
  }, [queryClient]);

  /** A refused creation: its fields become the draft of a new form. */
  const recopier = useCallback(async (c: Conflit) => {
    const valeurs = c.mutation.type === "create" ? c.mutation.livre : c.mutation.type === "update" ? c.mutation.champs : undefined;
    if (valeurs !== undefined) {
      await storage.write("booklist.brouillon.livre:new", JSON.stringify({ ...valeurs, annee: valeurs.annee === undefined ? "" : String(valeurs.annee) }));
    }
    await retirerConflit(c.id);
    router.push("/books/new");
  }, [router]);

  return { conflits, appliquerFusion, garderServeur: terminer, abandonner: terminer, supprimerQuandMeme, recopier };
}
```

- [ ] **Step 4: `EcranConflits.tsx` and the two routes**

`EcranConflits`: `useConflits().conflits`; empty → `EmptyState` title "Aucun conflit a traiter", description "Toutes vos modifications ont ete acceptees par le serveur."; else a `FlatList` of Paper `List.Item` — title = `c.serveur?.titre ?? (c.mutation.type === "create" ? c.mutation.livre.titre : c.mutation.livreId)`, description = `${c.type === "rejet" ? "Refuse" : "Conflit"} · ${readableDateTime(c.detecteLe)}`, `left` icon `alert-circle-outline`, `onPress` → `router.push({ pathname: "/conflits/[id]", params: { id: c.id } })`.

`app/(app)/conflits/index.tsx`: `if (!peutEcrire) return <Redirect href="/" />;` then `<EcranConflits />`.

`app/(app)/conflits/[id].tsx`: reads `id` from `useLocalSearchParams`, finds the conflict in `useConflits().conflits` (missing → `EmptyState` "Ce conflit a deja ete traite" with a "Revenir aux conflits" action), loads `useBook(conflit.mutation.livreId)` when the conflict has no `serveur` snapshot, renders `EcranFusion` with `serveur={conflit.serveur ?? query.data}` and the five callbacks each followed by `router.back()`.

- [ ] **Step 5: Run** — export (typed routes), `npx tsc --noEmit`, `npx jest features/sync 2>&1 | tail -10`, lint.

- [ ] **Step 6: Commit**

```
feat(conflits): assisted field-by-field merge screen

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 13: Dashboard

**Files:**
- Create: `domain/stats.ts`, `services/api/stats.ts`, `features/stats/useStats.ts`, `features/stats/TableauDeBord.tsx`, `components/stats/BarreEmpilee.tsx`, `components/stats/Histogramme.tsx`, `components/__tests__/BarreEmpilee.test.tsx`, `components/__tests__/Histogramme.test.tsx`
- Modify: `domain/index.ts`, `app/(app)/stats.tsx` (replace stub), `app/(app)/index.tsx` (header icon)

**Interfaces:**
- Produces: `StatsSchema`/`Stats`; `lireStats(signal?): Promise<Stats>`; `useStats()`; `BarreEmpilee({ titre, segments: { libelle: string; valeur: number }[] })`; `Histogramme({ titre, barres: { libelle: string; valeur: number }[] })`.

- [ ] **Step 1: `domain/stats.ts`**

```ts
import { z } from "zod";

/** GET /stats, as the server returns it. */
export const StatsSchema = z.object({
  total: z.number().int(),
  lus: z.number().int(),
  nonLus: z.number().int(),
  favoris: z.number().int(),
  moyenneNotes: z.number().nullable(),
  totalNotes: z.number().int(),
  distributionNotes: z.array(z.object({ note: z.number(), total: z.number().int() })),
  parAnnee: z.array(z.object({ annee: z.number().int(), total: z.number().int() })),
  parAuteur: z.array(z.object({ auteur: z.string(), total: z.number().int() })),
  genereLe: z.string(),
});

export type Stats = z.infer<typeof StatsSchema>;

/** The twelve most recent years present, oldest first: what fits on a till screen. */
export function anneesRecentes(stats: Stats, nombre = 12): Stats["parAnnee"] {
  return [...stats.parAnnee].sort((a, b) => a.annee - b.annee).slice(-nombre);
}
```

Export `StatsSchema`, `anneesRecentes`, `type Stats` from `domain/index.ts`.

`services/api/stats.ts`:

```ts
import { StatsSchema, type Stats } from "@/domain";

import { request } from "./client";

export function lireStats(signal?: AbortSignal): Promise<Stats> {
  return request("/stats", { schema: StatsSchema, signal });
}
```

- [ ] **Step 2: Failing component tests**

`components/__tests__/BarreEmpilee.test.tsx`:

```tsx
import { screen } from "@testing-library/react-native";

import { BarreEmpilee } from "@/components/stats/BarreEmpilee";
import { renderWithTheme } from "@/test-utils/render";

it("annonce chaque part avec sa valeur et son pourcentage", () => {
  renderWithTheme(<BarreEmpilee titre="Lus et non lus" segments={[{ libelle: "Lus", valeur: 320 }, { libelle: "Non lus", valeur: 180 }]} />);
  expect(screen.getByLabelText("Lus : 320 sur 500 (64 %)")).toBeTruthy();
  expect(screen.getByLabelText("Non lus : 180 sur 500 (36 %)")).toBeTruthy();
});

it("dit qu'il n'y a rien a montrer sur un fonds vide", () => {
  renderWithTheme(<BarreEmpilee titre="Lus et non lus" segments={[{ libelle: "Lus", valeur: 0 }]} />);
  expect(screen.getByText("Aucune donnee")).toBeTruthy();
});
```

`components/__tests__/Histogramme.test.tsx`:

```tsx
import { screen } from "@testing-library/react-native";

import { Histogramme } from "@/components/stats/Histogramme";
import { renderWithTheme } from "@/test-utils/render";

it("une barre par valeur, annoncee avec son total", () => {
  renderWithTheme(<Histogramme titre="Notes" barres={[{ libelle: "0", valeur: 2 }, { libelle: "5", valeur: 10 }]} />);
  expect(screen.getByLabelText("0 : 2")).toBeTruthy();
  expect(screen.getByLabelText("5 : 10")).toBeTruthy();
  expect(screen.getByRole("header", { name: "Notes" })).toBeTruthy();
});
```

- [ ] **Step 3: Implement the two charts** (Views only: widths/heights as `%`)

`BarreEmpilee.tsx`: `Text accessibilityRole="header" variant="titleMedium"` titre; `total = sum`; if `total === 0` → `Text` "Aucune donnee"; else a `View` row of height 24 with one `View` per segment `style={{ flexBasis: `${pct}%`, backgroundColor }}` (palette: `colors.accent`, `colors.accentBorder`, `colors.borderStrong`, cycling), each with `accessibilityLabel={`${libelle} : ${valeur} sur ${total} (${pct} %)`}`; below, a legend row with a colour square + `${libelle} ${valeur}`.

`Histogramme.tsx`: header; `max = Math.max(...valeurs, 1)`; a row `View` of height 120, `alignItems: "flex-end"`, one column per bar with `Text labelSmall` value on top, a `View` `style={{ height: `${Math.round((valeur / max) * 100)}%`, backgroundColor: colors.accent, borderRadius: radius.sm }}` with `accessibilityLabel={`${libelle} : ${valeur}`}`, and the label below.

- [ ] **Step 4: `useStats.ts` and `TableauDeBord.tsx`**

```ts
export function useStats() {
  return useQuery({ queryKey: statsKeys.all, queryFn: ({ signal }) => lireStats(signal) });
}
```

`TableauDeBord`: `const query = useStats(); const { enLigne } = useSync();`
- pending without data → `BookDetailSkeleton`-style skeleton (reuse `components/ui/Skeleton`);
- error without data → `ErrorState` with retry;
- data → `ScrollView` with: `<OfflineBanner visible={!enLigne && query.isError} />`; `Text` `Mis a jour le ${readableDateTime(new Date(query.dataUpdatedAt).toISOString())}` (accessible: same text); a row of four `Card`s (Total, Coups de coeur, Note moyenne `moyenneNotes?.toFixed(1) ?? "—"`, Notes); `<BarreEmpilee titre="Lus et non lus" segments={[{ libelle: "Lus", valeur: lus }, { libelle: "Non lus", valeur: nonLus }]} />`; `<Histogramme titre="Distribution des notes" barres={[...distributionNotes.map(d => ({ libelle: String(d.note), valeur: d.total })), { libelle: "Sans note", valeur: total - sum(distributionNotes) }]} />`; `<Histogramme titre="Ouvrages par annee" barres={anneesRecentes(stats).map(a => ({ libelle: String(a.annee), valeur: a.total }))} />`.

`app/(app)/stats.tsx`: `export default function StatsScreen() { return <TableauDeBord />; }`.

`app/(app)/index.tsx`: in the `HeaderActions` children, before the "Ajouter" button, add `<IconButton accessibilityLabel="Tableau de bord" icon="chart-box-outline" onPress={() => router.push("/stats")} />` (visible to every role).

- [ ] **Step 5: Run** — export, `npx tsc --noEmit`, `npx jest components features/stats 2>&1 | tail -10`, lint.

- [ ] **Step 6: Commit**

```
feat(stats): dashboard with read split and distributions, readable offline

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 14: End-to-end — recette 4.6 and offline cache

**Files:**
- Modify: `e2e/support/api.ts`
- Create: `e2e/offline-sync.spec.ts`, `e2e/offline-cache.spec.ts`

- [ ] **Step 1: Mock helpers in `e2e/support/api.ts`**

```ts
export type SyncCall = { bearer: string; mutations: { id: string; type: string; livre?: Record<string, unknown>; baseVersion?: number }[] };

/**
 * POST /sync, answered by a handler the test controls. Every call is recorded
 * with the bearer it carried, so a test can assert the same ids came back
 * after a refresh.
 */
export async function mockSync(page: Page, answer: (call: SyncCall, index: number) => { status?: number; json: unknown }): Promise<SyncCall[]> {
  const calls: SyncCall[] = [];
  await page.route('**/sync', async (route) => {
    const body = route.request().postDataJSON() as { mutations: SyncCall['mutations'] };
    const call = { bearer: route.request().headers()['authorization'] ?? '', mutations: body.mutations };
    calls.push(call);
    const { status = 200, json } = answer(call, calls.length - 1);
    await route.fulfill({ status, json });
  });
  return calls;
}

export async function mockStats(page: Page): Promise<void> {
  await page.route('**/stats', (route) => route.fulfill({ json: {
    total: 45, lus: 15, nonLus: 30, favoris: 3, moyenneNotes: 3.8, totalNotes: 12,
    distributionNotes: [{ note: 3, total: 4 }, { note: 5, total: 8 }],
    parAnnee: [{ annee: 2001, total: 20 }, { annee: 2002, total: 25 }],
    parAuteur: [], genereLe: TIMESTAMP,
  } }));
}
```

Also make `mockRecord` accept an optional `entry` override for `/books/l-1` returning a *function* so a test can bump the version mid-run: add `export async function mockRecordMutable(page, notes, holder: { entry: BookRecord })` that reads `holder.entry` on each call (same body as `mockRecord` otherwise).

- [ ] **Step 2: `e2e/offline-sync.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

import { book, mockCollection, mockRecordMutable, mockSync, openBookList, signedIn } from './support/api';

/**
 * The recette of section 4.6, on the browser target: offline creation and
 * edit, a colleague's server-side change, the token expiring meanwhile, the
 * network coming back. One creation, one conflict, nothing lost.
 */
test('recette 4.6 : hors ligne, jeton expire, conflit fusionne, une seule creation', async ({ page, context }) => {
  await signedIn(page);
  await mockCollection(page);
  const holder = { entry: book(1, { version: 1 }) };
  await mockRecordMutable(page, [], holder);

  let refreshes = 0;
  await page.route('**/auth/refresh', async (route) => {
    refreshes += 1;
    await route.fulfill({ json: { accessToken: 'acces-neuf', expiresIn: '120s' } });
  });

  const syncs = await mockSync(page, (call) => {
    if (call.bearer !== 'Bearer acces-neuf') {
      return { status: 401, json: { erreur: 'jeton_expire', message: 'Jeton expire.' } };
    }
    return {
      json: {
        resultats: call.mutations.map((m) =>
          m.type === 'create'
            ? { id: m.id, statut: 'ok', livre: book(99, { id: 'srv-99', titre: String(m.livre?.titre) }) }
            : m.baseVersion === 2
              ? { id: m.id, statut: 'ok', livre: book(1, { ...m.livre, version: 3 }) }
              : { id: m.id, statut: 'conflit', serveur: holder.entry, versionAttendue: 2 },
        ),
        resume: {}, serveurLe: '2026-09-11T10:00:00.000Z',
      },
    };
  });

  await openBookList(page);

  // 1–2. Offline, create a book.
  await context.setOffline(true);
  await expect(page.getByText('Hors ligne')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await page.getByLabel('Titre').fill('Cree hors ligne');
  await page.getByLabel('Auteur').fill('Moi');
  await page.getByLabel('Editeur').fill('Maison');
  await page.getByLabel('Annee').fill('2024');
  await page.getByRole('button', { name: 'Ajouter au fonds' }).click();
  await expect(page.getByText('Cree hors ligne')).toBeVisible();
  await expect(page.getByLabel('1 modification en attente. Synchroniser')).toBeVisible();

  // 3. Edit an existing book offline.
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await page.getByRole('button', { name: 'Modifier la fiche' }).click();
  await page.getByLabel('Titre').fill('Mon titre');
  await page.getByRole('button', { name: 'Enregistrer les corrections' }).click();
  await expect(page.getByLabel('2 modifications en attente. Synchroniser')).toBeVisible();

  // 4. Meanwhile the server-side change (the trainer's curl).
  holder.entry = book(1, { titre: 'Modifie par le serveur', version: 2 });

  // 5–6. The token has expired (first /sync answers 401); the network comes back.
  await context.setOffline(false);

  await expect(page.getByLabel('1 conflit a traiter')).toBeVisible();
  expect(refreshes).toBe(1);
  expect(syncs).toHaveLength(2);
  expect(syncs[0]?.mutations.map((m) => m.id)).toEqual(syncs[1]?.mutations.map((m) => m.id));
  expect(syncs[1]?.mutations.filter((m) => m.type === 'create')).toHaveLength(1);

  // The bookseller understands and arbitrates.
  await page.getByLabel('1 conflit a traiter').click();
  await page.getByText(/Ouvrage 1|Modifie par le serveur/).first().click();
  await expect(page.getByText('Cette fiche a ete modifiee par un collegue')).toBeVisible();
  await expect(page.getByText('Mon titre')).toBeVisible();
  await expect(page.getByText('Modifie par le serveur')).toBeVisible();
  await page.getByRole('button', { name: 'Appliquer la fusion' }).click();

  await expect(page.getByLabel('En ligne, tout est synchronise')).toBeVisible();
  expect(syncs).toHaveLength(3);
  expect(syncs[2]?.mutations[0]).toMatchObject({ type: 'update', baseVersion: 2, livre: { id: 'l-1', titre: 'Mon titre' } });
});

test('une note ecrite hors ligne survit a un rechargement et part au retour du reseau', async ({ page, context }) => {
  await signedIn(page);
  await mockCollection(page);
  await mockRecordMutable(page, [], { entry: book(1) });
  await mockSync(page, () => ({ json: { resultats: [] } }));

  await openBookList(page);
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await context.setOffline(true);
  await page.getByLabel('Note de lecture').fill('Ecrite sans reseau');
  await page.getByRole('button', { name: 'Ajouter la note' }).click();
  await expect(page.getByText('Ecrite sans reseau')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Ecrite sans reseau')).toBeVisible();
  await expect(page.getByLabel('1 modification en attente. Synchroniser')).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByLabel('En ligne, tout est synchronise')).toBeVisible();
});
```

Note: `context.setOffline(true)` makes routed requests fail too (Playwright aborts them), which is what flips `services/reseau` on the web via `navigator.onLine` and the failed fetch.

- [ ] **Step 3: `e2e/offline-cache.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

import { mockCollection, mockStats, openBookList, signedIn } from './support/api';

test('la liste et le tableau de bord restent consultables hors ligne apres rechargement', async ({ page, context }) => {
  await signedIn(page);
  await mockCollection(page);
  await mockStats(page);

  await openBookList(page);
  await page.getByLabel('Tableau de bord').click();
  await expect(page.getByLabel('Lus : 15 sur 45 (33 %)')).toBeVisible();
  await expect(page.getByText(/Mis a jour le/)).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByText(/Mis a jour le/)).toBeVisible();
  await expect(page.getByText('Hors ligne')).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
  await expect(page.getByText(/donnees du cache/)).toBeVisible();
});
```

- [ ] **Step 4: Run the suite**

`npm run build:web 2>&1 | tail -3 && npx playwright test 2>&1 | tail -15`. Expected: all green, previous 31 + 3 new. If the persisted cache makes an older spec see data from a previous test: each Playwright test has a fresh context (fresh localStorage), so no bleed.

- [ ] **Step 5: Commit**

```
test(e2e): recette 4.6 offline sync with token refresh and merge; offline cache

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```

---

### Task 15: ADRs and README

**Files:**
- Create: `docs/ADR/ADR007.md`, `docs/ADR/ADR008.md`
- Modify: `README.md`

- [ ] **Step 1: `docs/ADR/ADR007.md` — Mode hors ligne et file de mutations** (same layout as ADR006: Statut / Contexte / Décision / Conséquences / Alternatives écartées)

Cover: one write path (queue then sync, online too) and why (idempotence also under chaos 503, one code to test); the persisted queue with client ids kept across retries; folding rules; `/sync` batched through the interceptor and **the token expiring mid-batch** (refresh, same body, `rejeu: true`; refresh refused → queue kept on disk, resumed at next login); notes replayed on their own route with content dedupe; what is not cleared at logout (queue, conflicts, aliases) and the logout confirmation; the network signal (browser events + request outcomes, 503 ≠ offline); persisted cache (7 days, buster, enrichment excluded); known limit: a manual list refresh while creations are queued hides them until the sync (badge still counts them).

- [ ] **Step 2: `docs/ADR/ADR008.md` — Résolution des conflits : fusion assistée**

Cover: the three strategies and why assisted merge; what the bookseller sees (two columns, pre-selection, preview, "Garder la version serveur"); delete conflicts; rejections (422 / gone) kept as "rejet" with a copy-back; why `lu`/`favori` toggles carry no `baseVersion`; how a merge is sent (`update` with `baseVersion = versionAttendue`) and what happens if it conflicts again; testing (pure `decider`, `fusion`, e2e recette).

- [ ] **Step 3: README — section « Recette hors ligne (lot 4.6) »**

Steps with the real API (`cd ../api && npm run final`), the app (`.env` → port of that server, `rtk proxy npx expo export --platform web --output-dir dist && npm run serve:web`), then: sign in as `editeur@booklist.fr / editeur123`; DevTools → Network → Offline; create a book; edit "Ouvrage" X; in a terminal `curl -X PATCH http://localhost:3000/books/<ID> -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"titre":"Modifie par le serveur"}'` (note the auth server needs a bearer — get one with `curl -X POST /auth/login`); wait 120 s; go back online; expected indicator sequence and the merge screen. Also list the dashboard entry point and the sync indicator states.

- [ ] **Step 4: Final checks** — `npx tsc --noEmit`, lint, `npx jest 2>&1 | tail -6`, `npx playwright test 2>&1 | tail -5`, and `wc -l` on every new file (< 250).

- [ ] **Step 5: Commit**

```
docs: ADR 007 offline queue and ADR 008 assisted merge; README recette 4.6

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NYhYa7ecbvBesH5NhRC4yJ
```
