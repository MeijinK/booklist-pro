# Lot 4.1 — Comptes et rôles : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login screen, persisted session, single-flight token refresh behind one interceptor, protected routes with return path, and role-based hiding of every write action.

**Architecture:** `services/api/transport.ts` (one fetch) ← `services/auth/jetons.ts` (vault + single-flight refresh, module-private refresh token) ← `services/auth/intercepteur.ts` (inject / detect 401 `jeton_expire` / refresh / replay once) ← `services/api/client.ts` (retry loop, unchanged). React side: `features/session/SessionProvider` hydrates from storage without network; `app/(app)/_layout.tsx` redirects anonymous users to `/connexion?retour=<pathname>`; `useSession().peutEcrire` gates every write control by not rendering it.

**Tech Stack:** Expo SDK 54, Expo Router 6 (typed routes), React Native Paper, TanStack Query 5, react-hook-form + zod 4, expo-secure-store (new), Jest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-11-auth-roles-design.md`

## Global Constraints

- Every file < 250 lines. No `any`, no `@ts-ignore`, no `console.*`, no silent `catch` (a comment explains every swallowed error).
- No secret in the repo. The refresh token is never exported, never in React state, never in an `Error` message or `cause`.
- All network code lives in `services/`; `app/` and `components/` never call `fetch` or know a URL.
- UI copy: French, no exclamation, no emoji, addressed to the bookseller. Existing files use unaccented French in string literals (`"Reessayer"`, `"Coup de coeur"`); keep that convention in code, accents allowed in docs.
- Existing conventions: file names English (`storage.ts`), the spec-mandated `services/stockageSecurise.ts` and the new `services/auth/*` are French on purpose. Tests use `renderWithTheme` from `test-utils/render.tsx`; assertions by role/label/text, never by DOM structure.
- Git: a commit-guard hook blocks agent commits. Each "Commit" step below = tell the human the message; they run it.
- Per `AGENTS.md`: expo-secure-store v54 API is `getItemAsync/setItemAsync/deleteItemAsync`; Expo Router v54 `Redirect` accepts `{ pathname, params }`; `usePathname()` returns the path without query.

---

## File map

| Path | Responsibility |
| --- | --- |
| `services/api/transport.ts` (new) | `sendOnce`, `RequestOptions`, `HttpMethod` — one bounded fetch, no auth knowledge |
| `services/api/client.ts` (modify) | retry loop + schema validation; `send()` now calls `envoyerAuthentifie` |
| `services/stockageSecurise.ts` / `.web.ts` (new) | secure key/value; native secure-store / browser localStorage |
| `services/auth/jetons.ts` (new) | token vault, `rafraichir()` single-flight, `surSessionPerdue` |
| `services/auth/intercepteur.ts` (new) | inject header, detect `jeton_expire`, refresh, replay once |
| `services/auth/profil.ts` (new) | stored user profile (non-secret) in plain `storage` |
| `services/api/auth.ts` (new) | `connexion()`, `profil()` routes |
| `domain/utilisateur.ts` (new) | `Role`, `Utilisateur`, `peutEcrire`, `ROLE_LABELS`, `ConnexionSchema` |
| `domain/session.ts` (new) | `retourSur()`, `RaisonDeconnexion` |
| `domain/errors.ts` (modify) | `AUTH_CODES` += `identifiants_invalides`, `refresh_invalide` |
| `features/errors/messages.ts` (modify) | per-code auth messages |
| `features/session/SessionProvider.tsx`, `useSession.ts`, `useConnexionForm.ts`, `ConnexionForm.tsx`, `CompteMenu.tsx`, `HeaderActions.tsx`, `index.ts` (new) | React session |
| `app/_layout.tsx` (modify), `app/(app)/_layout.tsx`, `app/connexion.tsx` (new), `app/(app)/index.tsx`, `app/(app)/books/**` (moved) | routing + guard |
| `components/ui/ToggleControl.tsx`, `components/books/BookRow.tsx`, `BookDetail.tsx`, `BookListEmpty.tsx`, `components/notes/NoteRow.tsx`, `features/books/BookList.tsx`, `BookRecord.tsx`, `features/notes/NoteSection.tsx` (modify) | `readOnly` / optional write callbacks |
| `e2e/support/api.ts` (modify), `e2e/auth.spec.ts` (new), 3 existing specs (modify) | seeded session, auth journeys |
| `docs/ADR/ADR006.md` (new), `README.md` (modify) | decisions, demo accounts |

---

### Task 1: Extract the transport from the client

**Files:**
- Create: `services/api/transport.ts`
- Modify: `services/api/client.ts`
- Test: `services/api/__tests__/client.test.ts` (unchanged, must stay green)

**Interfaces:**
- Produces: `sendOnce(url: string, options: RequestOptions): Promise<Response>`, `type RequestOptions = { method?, body?, headers?, signal?, timeoutMs?, auth?: boolean }`, `type HttpMethod`.

- [ ] **Step 1: Run the client tests to get a baseline**

Run: `npx jest services/api/__tests__/client.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 2: Create `services/api/transport.ts`** — move `HttpMethod`, `RequestOptions` (adding `auth`), and `sendOnce` verbatim from `client.ts`:

```ts
import { ApiError } from "@/domain";
import { REQUEST_TIMEOUT_MS } from "@/services/config";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** Signal supplied by the caller, typically a TanStack Query request's. */
  signal?: AbortSignal;
  timeoutMs?: number;
  /**
   * False for the authentication routes themselves: they carry no bearer
   * token, and a 401 from them is an answer, not an expired session.
   */
  auth?: boolean;
};

/**
 * One network round trip, bounded in time. Knows nothing about tokens: the
 * interceptor sits above it, the retry loop above that.
 *
 * The timeout and the caller's cancellation are two distinct signals relayed to
 * a single controller: `AbortSignal.any` is not available everywhere the
 * application has to run.
 */
export async function sendOnce(url: string, options: RequestOptions): Promise<Response> {
  // ... body identical to the current sendOnce in client.ts ...
}
```

- [ ] **Step 3: Update `client.ts`** — delete the moved code, `import { sendOnce, type HttpMethod, type RequestOptions } from "./transport";` and `export type { HttpMethod, RequestOptions } from "./transport";` so existing importers keep working. Remove the now-unused `REQUEST_TIMEOUT_MS` import.

- [ ] **Step 4: Verify** — `npx jest services/api && npm run typecheck && npm run lint`. Expected: green.

- [ ] **Step 5: Commit** — `refactor(services): extract the single fetch into transport.ts`

---

### Task 2: Domain — user, role, login form schema, return path, auth codes

**Files:**
- Create: `domain/utilisateur.ts`, `domain/session.ts`, `domain/__tests__/utilisateur.test.ts`, `domain/__tests__/session.test.ts`
- Modify: `domain/errors.ts`, `domain/index.ts`

**Interfaces:**
- Produces: `ROLES`, `RoleSchema`, `type Role`, `UtilisateurSchema`, `type Utilisateur = { id: string; email: string; role: Role }`, `peutEcrire(role: Role | undefined): boolean`, `ROLE_LABELS: Record<Role, string>`, `ConnexionSchema`, `type ConnexionValues = { email: string; motDePasse: string }`, `retourSur(brut: unknown): string`, `type RaisonDeconnexion = "expiree"`.

- [ ] **Step 1: Write failing tests**

`domain/__tests__/utilisateur.test.ts`:
```ts
import { ConnexionSchema, peutEcrire, UtilisateurSchema } from "@/domain";

describe("peutEcrire", () => {
  it("n'accorde l'ecriture qu'a l'editeur", () => {
    expect(peutEcrire("editeur")).toBe(true);
    expect(peutEcrire("lecteur")).toBe(false);
    expect(peutEcrire(undefined)).toBe(false);
  });
});

describe("UtilisateurSchema", () => {
  it("refuse un role inconnu", () => {
    expect(UtilisateurSchema.safeParse({ id: "u", email: "a@b.fr", role: "admin" }).success).toBe(false);
  });
});

describe("ConnexionSchema", () => {
  it("exige un email valide et un mot de passe", () => {
    const result = ConnexionSchema.safeParse({ email: "pas-un-email", motDePasse: "" });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Cet email n'est pas valide.");
    expect(messages).toContain("Le mot de passe est obligatoire.");
  });

  it("nettoie les espaces autour de l'email", () => {
    expect(ConnexionSchema.parse({ email: "  a@b.fr ", motDePasse: "x" }).email).toBe("a@b.fr");
  });
});
```

`domain/__tests__/session.test.ts`:
```ts
import { retourSur } from "@/domain";

describe("retourSur", () => {
  it("garde un chemin interne", () => {
    expect(retourSur("/books/l-1")).toBe("/books/l-1");
  });

  it("prend la premiere valeur quand le parametre est repete", () => {
    expect(retourSur(["/books/new", "/x"])).toBe("/books/new");
  });

  it.each([undefined, "", "books", "//evil.example", "http://evil.example", "/connexion", "/connexion?retour=/"])(
    "retombe sur l'accueil pour %p",
    (valeur) => {
      expect(retourSur(valeur)).toBe("/");
    },
  );
});
```

- [ ] **Step 2: Run** — `npx jest domain/__tests__/utilisateur.test.ts domain/__tests__/session.test.ts`. Expected: FAIL (exports missing).

- [ ] **Step 3: Implement**

`domain/utilisateur.ts`:
```ts
import { z } from "zod";

export const ROLES = ["editeur", "lecteur"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

/** What /auth/login and /me return about the signed-in bookseller. */
export const UtilisateurSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: RoleSchema,
});
export type Utilisateur = z.infer<typeof UtilisateurSchema>;

/**
 * The one place that turns a role into a permission. Every write control in
 * the interface asks this, so a third role tomorrow changes one line.
 */
export function peutEcrire(role: Role | undefined): boolean {
  return role === "editeur";
}

/** Wording addressed to the bookseller, not the API's identifiers. */
export const ROLE_LABELS: Record<Role, string> = {
  editeur: "Libraire titulaire",
  lecteur: "Lecture seule",
};

export const ConnexionSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est obligatoire.")
    .pipe(z.email("Cet email n'est pas valide.")),
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire."),
});
export type ConnexionValues = z.infer<typeof ConnexionSchema>;
```

`domain/session.ts`:
```ts
/** Why the bookseller finds themselves on the login screen without asking. */
export type RaisonDeconnexion = "expiree";

/**
 * Where to send the bookseller back after login.
 *
 * The value comes from the URL and is therefore untrusted: only an internal
 * path is honoured. A protocol-relative `//host` or an absolute URL would turn
 * the login screen into an open redirect; landing back on `/connexion` would
 * loop.
 */
export function retourSur(brut: unknown): string {
  const valeur = Array.isArray(brut) ? brut[0] : brut;
  if (typeof valeur !== "string") return "/";
  if (!valeur.startsWith("/") || valeur.startsWith("//") || valeur.startsWith("/connexion")) {
    return "/";
  }
  return valeur;
}
```

`domain/errors.ts` — extend `AUTH_CODES`:
```ts
export const AUTH_CODES = [
  "jeton_absent",
  "jeton_expire",
  "jeton_invalide",
  "droits_insuffisants",
  "identifiants_invalides",
  "refresh_invalide",
] as const;
```

`domain/index.ts` — add:
```ts
export {
  ConnexionSchema, peutEcrire, ROLE_LABELS, ROLES, RoleSchema, UtilisateurSchema,
  type ConnexionValues, type Role, type Utilisateur,
} from "./utilisateur";
export { retourSur, type RaisonDeconnexion } from "./session";
```

- [ ] **Step 4: Run** — same command. Expected: PASS. Then `npm run typecheck`.

- [ ] **Step 5: Commit** — `feat(domain): user, role permission and login return path`

---

### Task 3: `services/stockageSecurise` (native + web) and the Jest mock

**Files:**
- Create: `services/stockageSecurise.ts`, `services/stockageSecurise.web.ts`, `services/__tests__/stockageSecurise.test.ts`
- Modify: `jest.setup.js`, `package.json` (dependency)

**Interfaces:**
- Produces: `stockageSecurise: Storage` (same contract as `services/storage.ts`: `read/write/remove`).

- [ ] **Step 1: Install** — `npx expo install expo-secure-store` (pins the SDK 54 version). Add the plugin to `app.json` `plugins` array: `"expo-secure-store"` (CNG requirement per docs; harmless on web).

- [ ] **Step 2: Jest mock** — append to `jest.setup.js`:
```js
// expo-secure-store is a native module with no implementation under Jest.
// An in-memory map is enough: the contract under test is ours, not Expo's.
jest.mock("expo-secure-store", () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});
```

- [ ] **Step 3: Failing test** — `services/__tests__/stockageSecurise.test.ts`:
```ts
import { stockageSecurise } from "@/services/stockageSecurise";
import { stockageSecurise as stockageWeb } from "@/services/stockageSecurise.web";

describe("stockageSecurise (natif)", () => {
  it("ecrit, relit et efface une valeur", async () => {
    await stockageSecurise.write("k", "v");
    expect(await stockageSecurise.read("k")).toBe("v");
    await stockageSecurise.remove("k");
    expect(await stockageSecurise.read("k")).toBeNull();
  });
});

describe("stockageSecurise (navigateur)", () => {
  const memoire = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => memoire.get(key) ?? null,
    setItem: (key: string, value: string) => void memoire.set(key, value),
    removeItem: (key: string) => void memoire.delete(key),
  };

  beforeEach(() => {
    memoire.clear();
    Object.defineProperty(globalThis, "window", { value: { localStorage }, configurable: true });
  });

  it("ecrit, relit et efface une valeur", async () => {
    await stockageWeb.write("k", "v");
    expect(await stockageWeb.read("k")).toBe("v");
    await stockageWeb.remove("k");
    expect(await stockageWeb.read("k")).toBeNull();
  });

  it("rapporte l'absence quand le navigateur refuse le stockage", async () => {
    Object.defineProperty(globalThis, "window", {
      get() {
        throw new Error("SecurityError");
      },
      configurable: true,
    });

    await expect(stockageWeb.write("k", "v")).resolves.toBeUndefined();
    await expect(stockageWeb.read("k")).resolves.toBeNull();
  });
});
```

- [ ] **Step 4: Run** — `npx jest services/__tests__/stockageSecurise.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 5: Implement**

`services/stockageSecurise.ts`:
```ts
import * as SecureStore from "expo-secure-store";

import type { Storage } from "./storage";

/**
 * Where the tokens live on a device: the system keychain (iOS) or keystore
 * (Android), through expo-secure-store. The browser has no equivalent; its
 * fallback is in `stockageSecurise.web.ts` and documented in ADR 006.
 *
 * Same contract and same failure policy as `storage.ts`: a refused write is
 * reported as absence, never as an exception reaching a screen. Losing a
 * session is a nuisance; a blank screen at the till is an incident.
 */
export const stockageSecurise: Storage = {
  async read(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async write(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Deliberately silent: see the note above.
    }
  },

  async remove(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Deliberately silent: see the note above.
    }
  },
};
```

`services/stockageSecurise.web.ts`:
```ts
import type { Storage } from "./storage";

/**
 * Browser fallback for the secure store — the primary target has no keychain.
 *
 * `localStorage` is readable by any script running on the page, so this is
 * only as secure as the page itself: no HTML injection anywhere, and an access
 * token that dies after 120 s. The refresh token survives a reload, which is
 * what "session persistee" requires on a shared till. ADR 006 records the
 * trade-off and the alternatives that were turned down.
 *
 * Accessed through a getter, not captured once: touching `window.localStorage`
 * throws when site data is blocked, and that must not happen at import time.
 */
function store(): globalThis.Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const stockageSecurise: Storage = {
  async read(key) {
    try {
      return store()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  async write(key, value) {
    try {
      store()?.setItem(key, value);
    } catch {
      // Quota exceeded, or site data blocked. Reported as absence on next read.
    }
  },

  async remove(key) {
    try {
      store()?.removeItem(key);
    } catch {
      // Same reasoning as write.
    }
  },
};
```

- [ ] **Step 6: Run** — same test. Expected: PASS. `npm run typecheck`.

- [ ] **Step 7: Commit** — `feat(services): secure token storage with a documented browser fallback`

---

### Task 4: `services/auth/jetons.ts` — vault and single-flight refresh

**Files:**
- Create: `services/auth/jetons.ts`, `services/auth/__tests__/jetons.test.ts`

**Interfaces:**
- Consumes: `stockageSecurise`, `sendOnce` (Task 1), `getBaseUrl`, `toApiError`, `ApiError`.
- Produces:
  - `chargerJetons(): Promise<boolean>` — loads access into memory; true if a refresh token exists.
  - `enregistrerJetons(j: { accessToken: string; refreshToken: string }): Promise<void>`
  - `jetonAcces(): string | null`
  - `rafraichir(): Promise<string>` — single-flight; resolves the new access token.
  - `effacerJetons(): Promise<void>`
  - `surSessionPerdue(cb: () => void): () => void` — unsubscribe function.
  - `reinitialiserPourTests(): void` — resets module state (tests only).

- [ ] **Step 1: Failing tests** — `services/auth/__tests__/jetons.test.ts`:
```ts
import { ApiError } from "@/domain";
import {
  chargerJetons, effacerJetons, enregistrerJetons, jetonAcces, rafraichir,
  reinitialiserPourTests, surSessionPerdue,
} from "@/services/auth/jetons";
import { stockageSecurise } from "@/services/stockageSecurise";

jest.mock("@/services/config", () => ({ getBaseUrl: () => "http://api.test", REQUEST_TIMEOUT_MS: 50 }));

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

const vraiFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(async () => {
  reinitialiserPourTests();
  await effacerJetons();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = vraiFetch;
});

describe("le coffre", () => {
  it("ne garde rien en memoire tant que rien n'est charge", async () => {
    await stockageSecurise.write("booklist.jeton.acces", "ancien");
    expect(jetonAcces()).toBeNull();
    expect(await chargerJetons()).toBe(false);
    expect(jetonAcces()).toBe("ancien");
  });

  it("signale la presence d'un jeton de rafraichissement", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    reinitialiserPourTests();
    expect(await chargerJetons()).toBe(true);
    expect(jetonAcces()).toBe("a");
  });
});

describe("rafraichir", () => {
  it("ne lance qu'un seul appel pour dix demandes simultanees", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: "neuf", expiresIn: "120s" }));

    const resultats = await Promise.all(Array.from({ length: 10 }, () => rafraichir()));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resultats).toEqual(Array(10).fill("neuf"));
    expect(jetonAcces()).toBe("neuf");
  });

  it("envoie le jeton de rafraichissement au serveur sans en-tete Authorization", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "secret-r" });
    fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: "neuf", expiresIn: "120s" }));

    await rafraichir();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/auth/refresh");
    expect(JSON.parse(String(init.body))).toEqual({ refreshToken: "secret-r" });
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("accepte un nouvel appel une fois le precedent termine", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "b", expiresIn: "120s" }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "c", expiresIn: "120s" }));

    await rafraichir();
    await expect(rafraichir()).resolves.toBe("c");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("efface tout et previent quand le serveur refuse le jeton", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "refresh_invalide" }));
    const perdue = jest.fn();
    surSessionPerdue(perdue);

    await expect(rafraichir()).rejects.toMatchObject({ detail: { kind: "auth", code: "jeton_invalide" } });

    expect(perdue).toHaveBeenCalledTimes(1);
    expect(jetonAcces()).toBeNull();
    expect(await stockageSecurise.read("booklist.jeton.rafraichissement")).toBeNull();
  });

  it("garde les jetons quand c'est le reseau qui flanche", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(503, { erreur: "service_indisponible" }));
    const perdue = jest.fn();
    surSessionPerdue(perdue);

    await expect(rafraichir()).rejects.toMatchObject({ detail: { kind: "network", status: 503 } });

    expect(perdue).not.toHaveBeenCalled();
    expect(jetonAcces()).toBe("a");
  });

  it("perd la session sans appel reseau quand aucun jeton de rafraichissement n'existe", async () => {
    const perdue = jest.fn();
    surSessionPerdue(perdue);

    await expect(rafraichir()).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(perdue).toHaveBeenCalledTimes(1);
  });

  it("ne laisse jamais fuir le jeton de rafraichissement dans une erreur", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "tres-secret" });
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "refresh_invalide" }));

    const erreur = await rafraichir().catch((cause: unknown) => cause);
    expect(JSON.stringify(erreur)).not.toContain("tres-secret");
    expect(String(erreur)).not.toContain("tres-secret");
  });
});
```

- [ ] **Step 2: Run** — `npx jest services/auth`. Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `services/auth/jetons.ts`:
```ts
import { z } from "zod";

import { ApiError } from "@/domain";
import { toApiError } from "@/services/api/errors";
import { sendOnce } from "@/services/api/transport";
import { getBaseUrl } from "@/services/config";
import { stockageSecurise } from "@/services/stockageSecurise";

const CLE_ACCES = "booklist.jeton.acces";
const CLE_RAFRAICHISSEMENT = "booklist.jeton.rafraichissement";

const RafraichissementSchema = z.object({ accessToken: z.string() });

/**
 * The token vault.
 *
 * The access token is mirrored in memory so the interceptor reads it
 * synchronously on every request. The refresh token never leaves this module:
 * it goes from the secure store to the body of POST /auth/refresh and nowhere
 * else — not into React state, not into an error, not into a log.
 *
 * `rafraichir` is single-flight. Ten requests answered 401 in the same instant
 * would otherwise send ten refreshes; the first caller starts one and the nine
 * others await the same promise.
 */
let accesEnMemoire: string | null = null;
let rafraichissementEnCours: Promise<string> | null = null;
const abonnes = new Set<() => void>();

export async function chargerJetons(): Promise<boolean> {
  const [acces, rafraichissement] = await Promise.all([
    stockageSecurise.read(CLE_ACCES),
    stockageSecurise.read(CLE_RAFRAICHISSEMENT),
  ]);
  accesEnMemoire = acces;
  return rafraichissement !== null;
}

export async function enregistrerJetons(jetons: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  accesEnMemoire = jetons.accessToken;
  await Promise.all([
    stockageSecurise.write(CLE_ACCES, jetons.accessToken),
    stockageSecurise.write(CLE_RAFRAICHISSEMENT, jetons.refreshToken),
  ]);
}

export function jetonAcces(): string | null {
  return accesEnMemoire;
}

export async function effacerJetons(): Promise<void> {
  accesEnMemoire = null;
  await Promise.all([
    stockageSecurise.remove(CLE_ACCES),
    stockageSecurise.remove(CLE_RAFRAICHISSEMENT),
  ]);
}

/** Called when the server no longer accepts the refresh token: the session is over. */
export function surSessionPerdue(abonne: () => void): () => void {
  abonnes.add(abonne);
  return () => abonnes.delete(abonne);
}

export function rafraichir(): Promise<string> {
  if (rafraichissementEnCours === null) {
    rafraichissementEnCours = executerRafraichissement().finally(() => {
      rafraichissementEnCours = null;
    });
  }
  return rafraichissementEnCours;
}

async function executerRafraichissement(): Promise<string> {
  const refreshToken = await stockageSecurise.read(CLE_RAFRAICHISSEMENT);
  if (refreshToken === null) throw await perdreSession();

  const response = await sendOnce(`${getBaseUrl()}/auth/refresh`, {
    method: "POST",
    body: { refreshToken },
  });

  // 400 (missing) and 401 (invalid or expired) both mean the server will never
  // accept this token again. Anything else is the server's problem, not the
  // session's: the tokens stay and the caller's retry policy applies.
  if (response.status === 400 || response.status === 401) throw await perdreSession();
  if (!response.ok) throw await toApiError(response);

  const parsed = RafraichissementSchema.safeParse(await lireCorps(response));
  if (!parsed.success) {
    throw new ApiError({ kind: "network", status: response.status, message: "Reponse inattendue du serveur." });
  }

  accesEnMemoire = parsed.data.accessToken;
  await stockageSecurise.write(CLE_ACCES, parsed.data.accessToken);
  return parsed.data.accessToken;
}

async function perdreSession(): Promise<ApiError> {
  await effacerJetons();
  abonnes.forEach((abonne) => abonne());
  return new ApiError({ kind: "auth", code: "jeton_invalide", message: "Votre session n'est plus valide." });
}

async function lireCorps(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Tests only: module state would otherwise leak from one test to the next. */
export function reinitialiserPourTests(): void {
  accesEnMemoire = null;
  rafraichissementEnCours = null;
  abonnes.clear();
}
```

- [ ] **Step 4: Run** — `npx jest services/auth`. Expected: PASS. `npm run typecheck && npm run lint`.

- [ ] **Step 5: Commit** — `feat(auth): token vault with single-flight refresh`

---

### Task 5: `services/auth/intercepteur.ts` and wiring into `client.ts`

**Files:**
- Create: `services/auth/intercepteur.ts`, `services/auth/__tests__/intercepteur.test.ts`
- Modify: `services/api/client.ts` (`send()` calls `envoyerAuthentifie`)

**Interfaces:**
- Consumes: `sendOnce`, `jetonAcces`, `rafraichir`, `ApiErrorBodySchema`.
- Produces: `envoyerAuthentifie(url: string, options: RequestOptions): Promise<Response>`.

- [ ] **Step 1: Failing tests** — `services/auth/__tests__/intercepteur.test.ts` (goes through the public `request()` so the retry loop is part of what is tested):
```ts
import { BookSchema, type Book } from "@/domain";
import { effacerJetons, enregistrerJetons, reinitialiserPourTests, surSessionPerdue } from "@/services/auth/jetons";
import { request } from "@/services/api/client";

jest.mock("@/services/config", () => ({ getBaseUrl: () => "http://api.test", REQUEST_TIMEOUT_MS: 50 }));

const livre: Book = {
  id: "abc", titre: "Dune", auteur: "Herbert", editeur: "Laffont", annee: 1965,
  lu: false, favori: false, note: null, couverture: null,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1,
};

function jsonResponse(status: number, body: unknown): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone: () => jsonResponse(status, body),
  };
  return response as unknown as Response;
}

type Appel = { url: string; init: RequestInit };

function appels(fetchMock: jest.Mock): Appel[] {
  return fetchMock.mock.calls.map(([url, init]) => ({ url, init }) as Appel);
}

function autorisation(appel: Appel): string | undefined {
  return (appel.init.headers as Record<string, string>)["Authorization"];
}

const vraiFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(async () => {
  reinitialiserPourTests();
  await effacerJetons();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = vraiFetch;
});

/** Answers like the API: 401 jeton_expire for the stale token, 200 otherwise. */
function serveurQuiExpire(jetonValide: string) {
  return (url: string, init: RequestInit) => {
    if (url.endsWith("/auth/refresh")) {
      return Promise.resolve(jsonResponse(200, { accessToken: jetonValide, expiresIn: "120s" }));
    }
    const porteur = (init.headers as Record<string, string>)["Authorization"];
    return Promise.resolve(
      porteur === `Bearer ${jetonValide}`
        ? jsonResponse(200, livre)
        : jsonResponse(401, { erreur: "jeton_expire", message: "Jeton expire." }),
    );
  };
}

describe("l'intercepteur", () => {
  it("injecte le jeton d'acces", async () => {
    await enregistrerJetons({ accessToken: "acces", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(200, livre));

    await request("/books/abc", { schema: BookSchema });

    expect(autorisation(appels(fetchMock)[0])).toBe("Bearer acces");
  });

  it("n'en met pas sur les routes d'authentification", async () => {
    await enregistrerJetons({ accessToken: "acces", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(200, livre));

    await request("/auth/login", { method: "POST", body: {}, schema: BookSchema, auth: false });

    expect(autorisation(appels(fetchMock)[0])).toBeUndefined();
  });

  it("rafraichit puis rejoue une requete dont le jeton a expire", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockImplementation(serveurQuiExpire("neuf"));

    await expect(request("/books/abc", { schema: BookSchema })).resolves.toEqual(livre);

    const urls = appels(fetchMock).map((appel) => appel.url);
    expect(urls).toEqual(["http://api.test/books/abc", "http://api.test/auth/refresh", "http://api.test/books/abc"]);
    expect(autorisation(appels(fetchMock)[2])).toBe("Bearer neuf");
  });

  it("ne lance qu'un rafraichissement pour dix requetes expirees en meme temps", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockImplementation(serveurQuiExpire("neuf"));

    const resultats = await Promise.all(
      Array.from({ length: 10 }, (_, i) => request(`/books/${i}`, { schema: BookSchema })),
    );

    expect(resultats).toHaveLength(10);
    const rafraichissements = appels(fetchMock).filter((a) => a.url.endsWith("/auth/refresh"));
    expect(rafraichissements).toHaveLength(1);
    // 10 first attempts + 1 refresh + 10 replays.
    expect(fetchMock).toHaveBeenCalledTimes(21);
  });

  it("ne rejoue qu'une fois : un second 401 remonte tel quel", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(200, { accessToken: "neuf", expiresIn: "120s" })
          : jsonResponse(401, { erreur: "jeton_expire" }),
      ),
    );

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_expire" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("laisse passer un 401 qui n'est pas une expiration", async () => {
    await enregistrerJetons({ accessToken: "acces", refreshToken: "r" });
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "jeton_invalide" }));

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_invalide" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("perd la session quand le rafraichissement est refuse", async () => {
    await enregistrerJetons({ accessToken: "perime", refreshToken: "r" });
    const perdue = jest.fn();
    surSessionPerdue(perdue);
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.endsWith("/auth/refresh")
          ? jsonResponse(401, { erreur: "refresh_invalide" })
          : jsonResponse(401, { erreur: "jeton_expire" }),
      ),
    );

    await expect(request("/books/abc", { schema: BookSchema })).rejects.toMatchObject({
      detail: { kind: "auth", code: "jeton_invalide" },
    });
    expect(perdue).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run** — `npx jest services/auth/__tests__/intercepteur.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** `services/auth/intercepteur.ts`:
```ts
import { ApiErrorBodySchema } from "@/domain";
import { sendOnce, type RequestOptions } from "@/services/api/transport";

import { jetonAcces, rafraichir } from "./jetons";

/**
 * The one interceptor. Every request of the application passes here:
 * bearer injection, detection of an expired token, refresh, one replay.
 *
 * Only `jeton_expire` triggers a refresh. A missing or forged token is not
 * something a refresh repairs, and treating every 401 the same would loop on a
 * server that keeps refusing.
 *
 * The replay is sent once and returned as is: a 401 on the replay reaches the
 * caller as an auth error rather than starting a second round.
 */
export async function envoyerAuthentifie(url: string, options: RequestOptions): Promise<Response> {
  if (options.auth === false) return sendOnce(url, options);

  const premiere = await sendOnce(url, avecJeton(options, jetonAcces()));
  if (premiere.status !== 401 || !(await estExpire(premiere))) return premiere;

  // Shared by every caller that lands here at the same moment: see jetons.ts.
  const nouveau = await rafraichir();
  return sendOnce(url, avecJeton(options, nouveau));
}

function avecJeton(options: RequestOptions, jeton: string | null): RequestOptions {
  if (jeton === null) return options;
  return { ...options, headers: { ...options.headers, Authorization: `Bearer ${jeton}` } };
}

/** Reads the error code on a clone: the body must stay readable for toApiError. */
async function estExpire(response: Response): Promise<boolean> {
  try {
    const parsed = ApiErrorBodySchema.safeParse(await response.clone().json());
    return parsed.success && parsed.data.erreur === "jeton_expire";
  } catch {
    // Unreadable body: not the expiry the API documents.
    return false;
  }
}
```

`services/api/client.ts` — in `send()`, replace `await sendOnce(url, options)` by `await envoyerAuthentifie(url, options)`; import `envoyerAuthentifie` from `@/services/auth/intercepteur`; drop the `sendOnce` import if unused.

- [ ] **Step 4: Run** — `npx jest services && npm run typecheck && npm run lint`. Expected: PASS (existing client tests too: their 200/503/422 responses never hit `clone`).

- [ ] **Step 5: Commit** — `feat(auth): single interceptor — inject, detect 401, refresh, replay`

---

### Task 6: Auth routes and stored profile

**Files:**
- Create: `services/api/auth.ts`, `services/auth/profil.ts`, `services/api/__tests__/auth.test.ts`, `services/auth/__tests__/profil.test.ts`

**Interfaces:**
- Produces: `connexion(email: string, motDePasse: string): Promise<Utilisateur>`, `profil(signal?: AbortSignal): Promise<Utilisateur>`, `lireUtilisateur(): Promise<Utilisateur | null>`, `ecrireUtilisateur(u: Utilisateur): Promise<void>`, `effacerUtilisateur(): Promise<void>`.

- [ ] **Step 1: Failing tests**

`services/api/__tests__/auth.test.ts`:
```ts
import { connexion } from "@/services/api/auth";
import { effacerJetons, jetonAcces, reinitialiserPourTests } from "@/services/auth/jetons";
import { stockageSecurise } from "@/services/stockageSecurise";

jest.mock("@/services/config", () => ({ getBaseUrl: () => "http://api.test", REQUEST_TIMEOUT_MS: 50 }));

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status < 300, status, json: async () => body, clone() { return this; } } as unknown as Response;
}

const vraiFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(async () => {
  reinitialiserPourTests();
  await effacerJetons();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  global.fetch = vraiFetch;
});

describe("connexion", () => {
  it("range les jetons et ne rend que l'utilisateur", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        accessToken: "a", refreshToken: "r", expiresIn: "120s",
        utilisateur: { id: "u-1", email: "editeur@booklist.fr", role: "editeur" },
      }),
    );

    const utilisateur = await connexion("editeur@booklist.fr", "editeur123");

    expect(utilisateur).toEqual({ id: "u-1", email: "editeur@booklist.fr", role: "editeur" });
    expect(Object.keys(utilisateur)).not.toContain("refreshToken");
    expect(jetonAcces()).toBe("a");
    expect(await stockageSecurise.read("booklist.jeton.rafraichissement")).toBe("r");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://api.test/auth/login");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("remonte des identifiants refuses comme erreur d'authentification", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { erreur: "identifiants_invalides", message: "Email ou mot de passe incorrect." }));

    await expect(connexion("x@y.fr", "faux")).rejects.toMatchObject({
      detail: { kind: "auth", code: "identifiants_invalides" },
    });
    expect(jetonAcces()).toBeNull();
  });
});
```

`services/auth/__tests__/profil.test.ts`:
```ts
import { ecrireUtilisateur, effacerUtilisateur, lireUtilisateur } from "@/services/auth/profil";
import { storage } from "@/services/storage";

beforeEach(() => effacerUtilisateur());

describe("le profil range localement", () => {
  it("revient tel qu'il a ete ecrit", async () => {
    await ecrireUtilisateur({ id: "u", email: "a@b.fr", role: "lecteur" });
    expect(await lireUtilisateur()).toEqual({ id: "u", email: "a@b.fr", role: "lecteur" });
  });

  it("est ignore s'il est illisible ou d'une autre forme", async () => {
    await storage.write("booklist.session.utilisateur", "{pas du json");
    expect(await lireUtilisateur()).toBeNull();
    await storage.write("booklist.session.utilisateur", JSON.stringify({ id: "u", role: "admin" }));
    expect(await lireUtilisateur()).toBeNull();
  });
});
```

- [ ] **Step 2: Run** — `npx jest services/api/__tests__/auth.test.ts services/auth/__tests__/profil.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement**

`services/api/auth.ts`:
```ts
import { z } from "zod";

import { UtilisateurSchema, type Utilisateur } from "@/domain";
import { enregistrerJetons } from "@/services/auth/jetons";

import { request } from "./client";

const ConnexionReponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  utilisateur: UtilisateurSchema,
});

/**
 * POST /auth/login. The tokens go straight into the vault; only the profile
 * comes out, so no caller — and no React state — ever holds a refresh token.
 */
export async function connexion(email: string, motDePasse: string): Promise<Utilisateur> {
  const reponse = await request("/auth/login", {
    method: "POST",
    body: { email, motDePasse },
    schema: ConnexionReponseSchema,
    auth: false,
  });

  await enregistrerJetons({ accessToken: reponse.accessToken, refreshToken: reponse.refreshToken });
  return reponse.utilisateur;
}

/** GET /me — the profile as the server sees it now. */
export function profil(signal?: AbortSignal): Promise<Utilisateur> {
  return request("/me", { schema: UtilisateurSchema, signal });
}
```

`services/auth/profil.ts`:
```ts
import { UtilisateurSchema, type Utilisateur } from "@/domain";
import { storage } from "@/services/storage";

/**
 * Who is signed in, kept in ordinary storage: an id, an email and a role are
 * not secrets, and reading them at start-up is what lets the application open
 * on the collection without a network round trip. A stale role is corrected by
 * the first 403 the server sends.
 */
const CLE = "booklist.session.utilisateur";

export async function lireUtilisateur(): Promise<Utilisateur | null> {
  const brut = await storage.read(CLE);
  if (brut === null) return null;

  try {
    const parsed = UtilisateurSchema.safeParse(JSON.parse(brut));
    return parsed.success ? parsed.data : null;
  } catch {
    // Unreadable JSON left by an older build: treated as no profile.
    return null;
  }
}

export async function ecrireUtilisateur(utilisateur: Utilisateur): Promise<void> {
  await storage.write(CLE, JSON.stringify(utilisateur));
}

export async function effacerUtilisateur(): Promise<void> {
  await storage.remove(CLE);
}
```

- [ ] **Step 4: Run** — same tests + `npm run typecheck`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(services): login route and locally stored profile`

---

### Task 7: Auth error messages

**Files:**
- Modify: `features/errors/messages.ts`
- Test: `features/errors/__tests__/messages.test.ts` (new)

- [ ] **Step 1: Failing test**
```ts
import { ApiError, type AuthCode } from "@/domain";
import { errorMessage } from "@/features/errors/messages";

function auth(code: AuthCode) {
  return errorMessage(new ApiError({ kind: "auth", code, message: "Role lecteur : action non autorisee." }));
}

describe("messages d'authentification", () => {
  it("explique un 403 en termes de metier", () => {
    expect(auth("droits_insuffisants")).toEqual({
      title: "Action reservee aux libraires titulaires",
      detail: "Votre compte est en lecture seule. Demandez a un titulaire d'effectuer cette modification.",
      retryable: false,
    });
  });

  it("dit quand ce sont les identifiants qui sont refuses", () => {
    expect(auth("identifiants_invalides").detail).toBe("Email ou mot de passe incorrect.");
  });

  it.each<AuthCode>(["jeton_absent", "jeton_expire", "jeton_invalide", "refresh_invalide"])(
    "invite a se reconnecter pour %s",
    (code) => {
      expect(auth(code).title).toBe("Votre session n'est plus valide");
      expect(auth(code).retryable).toBe(false);
    },
  );
});
```

- [ ] **Step 2: Run** — FAIL (current message is generic "Acces refuse").

- [ ] **Step 3: Implement** — replace the `case "auth"` in `fromDetail` with `return authMessage(detail.code);` and add:
```ts
function authMessage(code: AuthCode): ErrorMessage {
  switch (code) {
    case "droits_insuffisants":
      return {
        title: "Action reservee aux libraires titulaires",
        detail: "Votre compte est en lecture seule. Demandez a un titulaire d'effectuer cette modification.",
        retryable: false,
      };
    case "identifiants_invalides":
      return { title: "Connexion refusee", detail: "Email ou mot de passe incorrect.", retryable: false };
    default:
      return {
        title: "Votre session n'est plus valide",
        detail: "Reconnectez-vous pour continuer.",
        retryable: false,
      };
  }
}
```
(import `type AuthCode` from `@/domain`).

- [ ] **Step 4: Run** — PASS. Also `npx jest features` (existing tests untouched).

- [ ] **Step 5: Commit** — `feat(errors): readable messages for 403 and refused credentials`

---

### Task 8: `SessionProvider` and `useSession`

**Files:**
- Create: `features/session/SessionProvider.tsx`, `features/session/useSession.ts`, `features/session/index.ts`, `features/session/__tests__/SessionProvider.test.tsx`

**Interfaces:**
- Consumes: `chargerJetons`, `effacerJetons`, `surSessionPerdue`, `connexion` (api), `lireUtilisateur/ecrireUtilisateur/effacerUtilisateur`, `peutEcrire`, `useQueryClient`.
- Produces:
```ts
type SessionState =
  | { statut: "chargement" }
  | { statut: "anonyme"; raison?: RaisonDeconnexion }
  | { statut: "connecte"; utilisateur: Utilisateur };
type Session = SessionState & {
  utilisateur?: Utilisateur; peutEcrire: boolean; raison?: RaisonDeconnexion;
  connexion(email: string, motDePasse: string): Promise<void>;
  deconnexion(): Promise<void>;
};
useSession(): Session   // throws outside the provider
```

- [ ] **Step 1: Failing test** — `features/session/__tests__/SessionProvider.test.tsx`:
```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { SessionProvider, useSession } from "@/features/session";
import { connexion } from "@/services/api/auth";
import { effacerJetons, enregistrerJetons, reinitialiserPourTests, surSessionPerdue } from "@/services/auth/jetons";
import { ecrireUtilisateur, effacerUtilisateur } from "@/services/auth/profil";
import { createQueryClient } from "@/services/queryClient";

jest.mock("@/services/api/auth", () => ({ connexion: jest.fn() }));
jest.mock("@/services/auth/jetons", () => {
  const reel = jest.requireActual("@/services/auth/jetons");
  return { ...reel, surSessionPerdue: jest.fn(reel.surSessionPerdue) };
});

const connexionMock = connexion as jest.MockedFunction<typeof connexion>;
const EDITEUR = { id: "u-1", email: "editeur@booklist.fr", role: "editeur" as const };

function setup() {
  const client = createQueryClient();
  client.setQueryData(["books", "list"], { pages: [], pageParams: [] });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
  return { client, ...renderHook(() => useSession(), { wrapper }) };
}

beforeEach(async () => {
  reinitialiserPourTests();
  await effacerJetons();
  await effacerUtilisateur();
  connexionMock.mockReset();
});

describe("SessionProvider", () => {
  it("demarre anonyme quand rien n'est range", async () => {
    const { result } = setup();
    expect(result.current.statut).toBe("chargement");
    await waitFor(() => expect(result.current.statut).toBe("anonyme"));
    expect(result.current.peutEcrire).toBe(false);
  });

  it("reprend la session rangee sans appel reseau", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    await ecrireUtilisateur(EDITEUR);
    reinitialiserPourTests();

    const { result } = setup();
    await waitFor(() => expect(result.current.statut).toBe("connecte"));
    expect(result.current.utilisateur).toEqual(EDITEUR);
    expect(result.current.peutEcrire).toBe(true);
    expect(connexionMock).not.toHaveBeenCalled();
  });

  it("reste anonyme si le profil existe mais pas le jeton de rafraichissement", async () => {
    await ecrireUtilisateur(EDITEUR);
    const { result } = setup();
    await waitFor(() => expect(result.current.statut).toBe("anonyme"));
  });

  it("connecte, puis deconnecte en vidant jetons, profil et cache", async () => {
    connexionMock.mockResolvedValue({ ...EDITEUR, role: "lecteur" });
    const { result, client } = setup();
    await waitFor(() => expect(result.current.statut).toBe("anonyme"));

    await act(() => result.current.connexion("editeur@booklist.fr", "x"));
    expect(result.current.statut).toBe("connecte");
    expect(result.current.peutEcrire).toBe(false);

    await act(() => result.current.deconnexion());
    expect(result.current.statut).toBe("anonyme");
    expect(result.current.raison).toBeUndefined();
    expect(client.getQueryData(["books", "list"])).toBeUndefined();
  });

  it("passe anonyme avec une raison quand la session est perdue", async () => {
    await enregistrerJetons({ accessToken: "a", refreshToken: "r" });
    await ecrireUtilisateur(EDITEUR);
    const { result } = setup();
    await waitFor(() => expect(result.current.statut).toBe("connecte"));

    const perdre = (surSessionPerdue as jest.Mock).mock.calls[0][0] as () => void;
    act(() => perdre());

    await waitFor(() => expect(result.current.statut).toBe("anonyme"));
    expect(result.current.raison).toBe("expiree");
  });

  it("refuse d'etre lu hors du fournisseur", () => {
    expect(() => renderHook(() => useSession())).toThrow(/SessionProvider/);
  });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement**

`features/session/SessionProvider.tsx`:
```tsx
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { peutEcrire, type RaisonDeconnexion, type Utilisateur } from "@/domain";
import { connexion as connexionApi } from "@/services/api/auth";
import { chargerJetons, effacerJetons, surSessionPerdue } from "@/services/auth/jetons";
import { ecrireUtilisateur, effacerUtilisateur, lireUtilisateur } from "@/services/auth/profil";

export type SessionState =
  | { statut: "chargement" }
  | { statut: "anonyme"; raison?: RaisonDeconnexion }
  | { statut: "connecte"; utilisateur: Utilisateur };

export type Session = SessionState & {
  utilisateur?: Utilisateur;
  peutEcrire: boolean;
  raison?: RaisonDeconnexion;
  connexion: (email: string, motDePasse: string) => Promise<void>;
  deconnexion: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

/**
 * Who is signed in, for the whole tree.
 *
 * Start-up reads the vault and the stored profile and touches no network: the
 * collection opens at once, and a token that expired overnight is refreshed by
 * the first request, invisibly. Only the profile lives in React state; the
 * tokens stay in services/auth.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [etat, setEtat] = useState<SessionState>({ statut: "chargement" });

  useEffect(() => {
    let actif = true;

    void Promise.all([chargerJetons(), lireUtilisateur()]).then(([aJeton, utilisateur]) => {
      if (!actif) return;
      setEtat(aJeton && utilisateur !== null ? { statut: "connecte", utilisateur } : { statut: "anonyme" });
    });

    return () => {
      actif = false;
    };
  }, []);

  const oublier = useCallback(
    async (raison?: RaisonDeconnexion) => {
      await Promise.all([effacerJetons(), effacerUtilisateur()]);
      // Another bookseller may sign in on this till next: nothing of the
      // previous session may survive in the cache.
      queryClient.clear();
      setEtat({ statut: "anonyme", raison });
    },
    [queryClient],
  );

  useEffect(() => surSessionPerdue(() => void oublier("expiree")), [oublier]);

  const connexion = useCallback(async (email: string, motDePasse: string) => {
    const utilisateur = await connexionApi(email, motDePasse);
    await ecrireUtilisateur(utilisateur);
    setEtat({ statut: "connecte", utilisateur });
  }, []);

  const deconnexion = useCallback(() => oublier(), [oublier]);

  const value = useMemo<Session>(() => {
    const utilisateur = etat.statut === "connecte" ? etat.utilisateur : undefined;
    return { ...etat, utilisateur, peutEcrire: peutEcrire(utilisateur?.role), connexion, deconnexion };
  }, [etat, connexion, deconnexion]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
```

`features/session/useSession.ts`:
```ts
import { useContext } from "react";

import { SessionContext, type Session } from "./SessionProvider";

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (session === null) throw new Error("useSession doit etre appele sous SessionProvider.");
  return session;
}
```

`features/session/index.ts`:
```ts
export { SessionProvider, type Session, type SessionState } from "./SessionProvider";
export { useSession } from "./useSession";
```

- [ ] **Step 4: Run** — `npx jest features/session && npm run typecheck && npm run lint`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(session): provider hydrated from storage, logout clears cache`

---

### Task 9: Login form

**Files:**
- Create: `features/session/useConnexionForm.ts`, `features/session/ConnexionForm.tsx`, `components/__tests__/ConnexionForm.test.tsx`
- Modify: `features/session/index.ts` (export `ConnexionForm`)

**Interfaces:**
- Produces: `ConnexionForm({ connexion, raison }: { connexion: (email, motDePasse) => Promise<void>; raison?: RaisonDeconnexion })` — pure of the provider, so testable alone.

- [ ] **Step 1: Failing test** — `components/__tests__/ConnexionForm.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/domain";
import { ConnexionForm } from "@/features/session";
import { renderWithTheme } from "@/test-utils/render";

function remplir(email = "editeur@booklist.fr", motDePasse = "editeur123") {
  fireEvent.changeText(screen.getByLabelText("Email"), email);
  fireEvent.changeText(screen.getByLabelText("Mot de passe"), motDePasse);
}

describe("ConnexionForm", () => {
  it("n'envoie rien tant que la saisie est invalide", async () => {
    const connexion = jest.fn();
    renderWithTheme(<ConnexionForm connexion={connexion} />);

    remplir("pas-un-email", "");
    fireEvent.press(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByText("Cet email n'est pas valide.")).toBeTruthy());
    expect(screen.getByText("Le mot de passe est obligatoire.")).toBeTruthy();
    expect(connexion).not.toHaveBeenCalled();
  });

  it("envoie l'email nettoye et le mot de passe tel quel", async () => {
    const connexion = jest.fn().mockResolvedValue(undefined);
    renderWithTheme(<ConnexionForm connexion={connexion} />);

    remplir(" editeur@booklist.fr ", "editeur123");
    fireEvent.press(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(connexion).toHaveBeenCalledWith("editeur@booklist.fr", "editeur123"));
  });

  it("dit que les identifiants sont refuses et garde la saisie", async () => {
    const connexion = jest.fn().mockRejectedValue(
      new ApiError({ kind: "auth", code: "identifiants_invalides", message: "Email ou mot de passe incorrect." }),
    );
    renderWithTheme(<ConnexionForm connexion={connexion} />);

    remplir();
    fireEvent.press(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(screen.getByText(/Email ou mot de passe incorrect/)).toBeTruthy());
    expect(screen.getByLabelText("Email").props.value).toBe("editeur@booklist.fr");
  });

  it("explique pourquoi on revient ici quand la session a expire", () => {
    renderWithTheme(<ConnexionForm connexion={jest.fn()} raison="expiree" />);
    expect(screen.getByText("Votre session a expire. Reconnectez-vous.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement**

`features/session/useConnexionForm.ts`:
```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";

import { ConnexionSchema, type ConnexionValues } from "@/domain";
import { errorMessage } from "@/features/errors/messages";

export type ConnexionFormReturn = UseFormReturn<ConnexionValues>;

type Options = { connexion: (email: string, motDePasse: string) => Promise<void> };

/**
 * Local validation by zod; a refusal from the server lands on the form as a
 * whole, because the API does not say which of the two fields is wrong — and
 * must not, or it would confirm which emails have an account.
 */
export function useConnexionForm({ connexion }: Options) {
  const form: ConnexionFormReturn = useForm<ConnexionValues>({
    resolver: zodResolver(ConnexionSchema),
    defaultValues: { email: "", motDePasse: "" },
    mode: "onBlur",
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await connexion(values.email, values.motDePasse);
    } catch (cause) {
      const { title, detail } = errorMessage(cause);
      form.setError("root", { type: "server", message: `${title}. ${detail}` });
    }
  });

  return { form, submit };
}
```

`features/session/ConnexionForm.tsx`:
```tsx
import { Controller } from "react-hook-form";
import { ScrollView, StyleSheet, View } from "react-native";
import { Banner, Button, HelperText, Text, TextInput } from "react-native-paper";

import type { RaisonDeconnexion } from "@/domain";
import { MAX_TEXT_WIDTH, space } from "@/theme";

import { useConnexionForm } from "./useConnexionForm";

type Props = {
  connexion: (email: string, motDePasse: string) => Promise<void>;
  raison?: RaisonDeconnexion;
};

/**
 * The login screen. Two fields, one button, and the reason the bookseller is
 * here when the application brought them back without asking.
 */
export function ConnexionForm({ connexion, raison }: Props) {
  const { form, submit } = useConnexionForm({ connexion });
  const { control, formState } = form;
  const rootError = formState.errors.root?.message;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <Text accessibilityRole="header" variant="headlineMedium">
          Connexion
        </Text>
        <Text variant="bodyMedium" style={styles.lead}>
          Le cahier de lecture des Comptoirs du Livre.
        </Text>

        <Banner visible={raison === "expiree"} icon="clock-alert-outline">
          Votre session a expire. Reconnectez-vous.
        </Banner>
        <Banner visible={rootError !== undefined} icon="alert-circle-outline">
          {rootError ?? ""}
        </Banner>

        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                error={fieldState.error !== undefined}
                inputMode="email"
                label="Email"
                mode="outlined"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                ref={field.ref}
                value={field.value}
              />
              <HelperText padding="none" type="error" visible style={styles.hint}>
                {fieldState.error?.message ?? " "}
              </HelperText>
            </>
          )}
        />

        <Controller
          control={control}
          name="motDePasse"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel="Mot de passe"
                autoCapitalize="none"
                autoComplete="current-password"
                error={fieldState.error !== undefined}
                label="Mot de passe"
                mode="outlined"
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                onSubmitEditing={() => void submit()}
                ref={field.ref}
                secureTextEntry
                value={field.value}
              />
              <HelperText padding="none" type="error" visible style={styles.hint}>
                {fieldState.error?.message ?? " "}
              </HelperText>
            </>
          )}
        />

        {/* Disabled while sending: a double tap on a slow link must not send
            the credentials twice. */}
        <Button
          mode="contained"
          onPress={() => void submit()}
          disabled={formState.isSubmitting}
          loading={formState.isSubmitting}
          style={styles.button}
        >
          Se connecter
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", flexGrow: 1, justifyContent: "center", padding: space.lg },
  column: { gap: space.xs, maxWidth: MAX_TEXT_WIDTH, width: "100%" },
  lead: { marginBottom: space.lg },
  hint: { minHeight: 20 },
  button: { marginTop: space.md },
});
```

Add `export { ConnexionForm } from "./ConnexionForm";` to `features/session/index.ts`.

- [ ] **Step 4: Run** — `npx jest components/__tests__/ConnexionForm.test.tsx && npm run typecheck && npm run lint`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(session): login form`

---

### Task 10: Routing — group, guard, login route, account menu

**Files:**
- Create: `app/(app)/_layout.tsx`, `app/connexion.tsx`, `features/session/CompteMenu.tsx`, `features/session/HeaderActions.tsx`, `components/__tests__/CompteMenu.test.tsx`
- Move: `app/index.tsx` → `app/(app)/index.tsx`, `app/books/**` → `app/(app)/books/**` (`git mv`)
- Modify: `app/_layout.tsx`, `features/session/index.ts`

**Interfaces:**
- Produces: `HeaderActions({ children? })` — row with optional leading actions, then `CompteMenu`, then `ThemeMenu`. `CompteMenu({ email, role, onDeconnexion })` pure; `CompteMenuConnecte()` reads the session.

- [ ] **Step 1: Failing test** — `components/__tests__/CompteMenu.test.tsx`:
```tsx
import { fireEvent, screen } from "@testing-library/react-native";

import { CompteMenu } from "@/features/session/CompteMenu";
import { renderWithTheme } from "@/test-utils/render";

describe("CompteMenu", () => {
  it("nomme le compte et son role, et propose la deconnexion", () => {
    const onDeconnexion = jest.fn();
    renderWithTheme(<CompteMenu email="lecteur@booklist.fr" role="lecteur" onDeconnexion={onDeconnexion} />);

    fireEvent.press(screen.getByLabelText("Compte : lecteur@booklist.fr"));
    expect(screen.getByText("lecteur@booklist.fr")).toBeTruthy();
    expect(screen.getByText("Lecture seule")).toBeTruthy();

    fireEvent.press(screen.getByText("Se deconnecter"));
    expect(onDeconnexion).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Implement**

`features/session/CompteMenu.tsx`:
```tsx
import { useState } from "react";
import { IconButton, Menu } from "react-native-paper";

import { DeferredMenu } from "@/components/ui/DeferredMenu";
import { ROLE_LABELS, type Role } from "@/domain";

import { useSession } from "./useSession";

type Props = { email: string; role: Role; onDeconnexion: () => void };

/** Who is signed in, and the way out. Pure: the connected variant is below. */
export function CompteMenu({ email, role, onDeconnexion }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <DeferredMenu
      visible={open}
      onDismiss={() => setOpen(false)}
      anchor={
        <IconButton
          accessibilityLabel={`Compte : ${email}`}
          accessibilityRole="button"
          icon="account-circle-outline"
          onPress={() => setOpen(true)}
        />
      }
    >
      <Menu.Item disabled leadingIcon="account" title={email} />
      <Menu.Item disabled leadingIcon={role === "editeur" ? "pencil" : "eye"} title={ROLE_LABELS[role]} />
      <Menu.Item
        leadingIcon="logout"
        title="Se deconnecter"
        onPress={() => {
          setOpen(false);
          onDeconnexion();
        }}
      />
    </DeferredMenu>
  );
}

/** The menu bound to the current session; renders nothing when anonymous. */
export function CompteMenuConnecte() {
  const session = useSession();
  if (session.statut !== "connecte") return null;

  return (
    <CompteMenu
      email={session.utilisateur.email}
      role={session.utilisateur.role}
      onDeconnexion={() => void session.deconnexion()}
    />
  );
}
```

`features/session/HeaderActions.tsx`:
```tsx
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { ThemeMenu } from "@/components/ui/ThemeMenu";

import { CompteMenuConnecte } from "./CompteMenu";

/**
 * The right side of every header: a screen's own actions first, then the
 * account, then the appearance. One component so no screen forgets one.
 */
export function HeaderActions({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.row}>
      {children}
      <CompteMenuConnecte />
      <ThemeMenu />
    </View>
  );
}

const styles = StyleSheet.create({ row: { alignItems: "center", flexDirection: "row" } });
```

`features/session/index.ts` — add `export { HeaderActions } from "./HeaderActions";`.

Move screens: `git mv app/index.tsx "app/(app)/index.tsx"` and `git mv app/books "app/(app)/books"` (create `app/(app)` first). In `app/(app)/index.tsx` replace the inline header row by `HeaderActions` (final version with role gating comes in Task 11; for now):
```tsx
headerRight: () => (
  <HeaderActions>
    <Button accessibilityLabel="Ajouter" mode="text" icon="plus" onPress={create}>Ajouter</Button>
  </HeaderActions>
),
```
and drop the `View`/`ThemeMenu` imports.

`app/(app)/_layout.tsx`:
```tsx
import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { HeaderActions, useSession } from "@/features/session";
import { paperTheme, useAppTheme } from "@/theme";

export const unstable_settings = { anchor: "index" };

/**
 * Everything behind the login. An anonymous visitor is sent to the login
 * screen with the path they asked for, and comes back to it once signed in.
 */
export default function AppLayout() {
  const { statut } = useSession();
  const pathname = usePathname();
  const { colors, scheme } = useAppTheme();
  const theme = paperTheme(scheme);

  if (statut === "chargement") {
    // Never a blank page: the splash gives way to a marked wait, on the
    // application's own background so nothing flashes white.
    return (
      <View accessibilityLabel="Ouverture du cahier" style={[styles.wait, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (statut === "anonyme") {
    return <Redirect href={{ pathname: "/connexion", params: { retour: pathname } }} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceSunken },
        headerTintColor: colors.accent,
        headerTitleStyle: { ...theme.fonts.titleMedium, color: colors.textStrong },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <HeaderActions />,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Le fonds" }} />
      <Stack.Screen name="books/new" options={{ title: "Nouvel ouvrage" }} />
      <Stack.Screen name="books/[id]/index" options={{ title: "Fiche" }} />
      <Stack.Screen name="books/[id]/edit" options={{ title: "Corriger la fiche" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({ wait: { alignItems: "center", flex: 1, justifyContent: "center" } });
```

`app/connexion.tsx`:
```tsx
import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { View } from "react-native";

import { retourSur } from "@/domain";
import { ConnexionForm, useSession } from "@/features/session";
import { useAppTheme } from "@/theme";

export default function ConnexionScreen() {
  const session = useSession();
  const { retour } = useLocalSearchParams<{ retour?: string | string[] }>();
  const { colors } = useAppTheme();

  // Already signed in — from a stale link or once the form succeeds: straight
  // back to where the bookseller was heading. The cast is deliberate: the path
  // comes from the URL, retourSur has already restricted it to an internal one.
  if (session.statut === "connecte") return <Redirect href={retourSur(retour) as Href} />;

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <ConnexionForm connexion={session.connexion} raison={session.raison} />
    </View>
  );
}
```

`app/_layout.tsx` — `ThemedApp` becomes:
```tsx
<PaperProvider theme={theme} settings={paperSettings}>
  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="connexion" />
    <Stack.Screen name="(app)" />
  </Stack>
  <StatusBar style={scheme === "dark" ? "light" : "dark"} />
</PaperProvider>
```
`unstable_settings = { anchor: "(app)" }`; wrap `<ThemedApp />` in `<SessionProvider>` inside `QueryClientProvider`; remove the `ThemeMenu` import (now in `HeaderActions`); `paperTheme` still used for fonts? No — drop `theme.fonts` usage here, keep `paperTheme(scheme)` for the `PaperProvider`.

- [ ] **Step 3: Regenerate typed routes and verify** — `rm -f .expo/types/router.d.ts && npx expo customize` is not needed: run `npx expo export --platform web --output-dir dist` (also needed for e2e) which regenerates `.expo/types/router.d.ts`. Then `npm run typecheck && npm run lint && npx jest`. Expected: green.

- [ ] **Step 4: Manual check** — `npm run web`, with `cd ../api && npm run auth` in another terminal. Open `http://localhost:8081/books/new` → lands on `/connexion?retour=%2Fbooks%2Fnew` → sign in `editeur@booklist.fr / editeur123` → lands on "Nouvel ouvrage". Account menu shows email + "Libraire titulaire"; "Se deconnecter" → `/connexion`. Reload while signed in → collection opens without login. Wait > 120 s, click a heart → still works, no login screen (refresh happened).

- [ ] **Step 5: Commit** — `feat(routing): protected group with return path, login route, account menu`

---

### Task 11: Roles — hide every write control

**Files:**
- Modify: `components/ui/ToggleControl.tsx`, `components/books/BookDetail.tsx`, `components/books/BookRow.tsx`, `components/books/BookListEmpty.tsx`, `components/notes/NoteRow.tsx`, `features/books/BookList.tsx`, `features/books/BookRecord.tsx`, `features/notes/NoteSection.tsx`, `app/(app)/index.tsx`, `app/(app)/books/[id]/index.tsx`, `app/(app)/books/new.tsx`, `app/(app)/books/[id]/edit.tsx`
- Tests: add cases to `components/__tests__/ToggleControl.test.tsx`, `BookRow.test.tsx`, `NoteRow.test.tsx`; new `components/__tests__/BookListEmpty.test.tsx` case; `features/books/__tests__/BookRecord.readonly.test.tsx` (new)

**Interfaces:**
- `ToggleControl` + `readOnly?: boolean`; `BookDetail` + `readOnly?: boolean`; `BookRow` + `readOnly?: boolean`; `BookListEmpty.onCreate?: () => void`; `NoteRow.onDelete?: (id: string) => void`; `BookList` + `readOnly?: boolean`, `onCreate?: () => void`; `BookRecord` + `readOnly?: boolean`; `NoteSection` + `readOnly?: boolean`.

- [ ] **Step 1: Failing tests**

Append to `components/__tests__/ToggleControl.test.tsx`:
```tsx
it("en lecture seule, montre l'etat sans offrir de bascule", () => {
  const onToggle = jest.fn();
  renderWithTheme(
    <ToggleControl checked icon={ICON} label="Lu" name="Statut de lecture" onToggle={onToggle} readOnly />,
  );

  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.getByLabelText("Statut de lecture : Lu")).toBeTruthy();
});
```

Append to `components/__tests__/BookRow.test.tsx` (reuse that file's `renderRow`/book helpers; adapt names to what exists there):
```tsx
it("en lecture seule, n'offre pas le coup de coeur", () => {
  renderWithTheme(<BookRow book={livre({ favori: true })} onOpen={jest.fn()} onToggleFavourite={jest.fn()} readOnly />);

  expect(screen.queryByRole("switch")).toBeNull();
  expect(screen.getByLabelText("Coup de coeur")).toBeTruthy();
});
```

Append to `components/__tests__/NoteRow.test.tsx`:
```tsx
it("n'offre pas de suppression quand aucune n'est possible", () => {
  renderWithTheme(<NoteRow note={NOTE} sending={false} />);

  expect(screen.queryByLabelText(/Supprimer la note/)).toBeNull();
  expect(screen.getByText(NOTE.contenu)).toBeTruthy();
});
```

`components/__tests__/BookListEmpty.test.tsx` (new file):
```tsx
import { screen } from "@testing-library/react-native";

import { BookListEmpty } from "@/components/books/BookListEmpty";
import { renderWithTheme } from "@/test-utils/render";

describe("BookListEmpty", () => {
  it("propose d'ajouter quand le fonds est vide et qu'on peut ecrire", () => {
    renderWithTheme(<BookListEmpty search="" narrowed={false} onCreate={jest.fn()} onClear={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Ajouter un ouvrage" })).toBeTruthy();
  });

  it("ne propose rien a un compte en lecture seule", () => {
    renderWithTheme(<BookListEmpty search="" narrowed={false} onClear={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Ajouter un ouvrage" })).toBeNull();
    expect(screen.getByText("Le fonds est vide")).toBeTruthy();
  });
});
```

`features/books/__tests__/BookRecord.readonly.test.tsx` (new; seeds the cache so no fetch runs):
```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react-native";

import type { Book } from "@/domain";
import { BookRecord } from "@/features/books/BookRecord";
import { createQueryClient } from "@/services/queryClient";
import { bookKeys, noteKeys } from "@/services/queryKeys";
import { renderWithTheme } from "@/test-utils/render";

const LIVRE: Book = {
  id: "l-1", titre: "Dune", auteur: "Herbert", editeur: "Laffont", annee: 1965,
  lu: false, favori: false, note: null, couverture: null,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1,
};

function renderRecord(readOnly: boolean) {
  const client = createQueryClient();
  client.setQueryData(bookKeys.detail("l-1"), LIVRE);
  client.setQueryData(noteKeys.list("l-1"), []);

  return renderWithTheme(
    <QueryClientProvider client={client}>
      <BookRecord id="l-1" readOnly={readOnly} onEdit={jest.fn()} onDeleted={jest.fn()} onBackToList={jest.fn()} />
    </QueryClientProvider>,
  );
}

describe("BookRecord en lecture seule", () => {
  it("masque toute action d'ecriture", () => {
    renderRecord(true);

    expect(screen.queryByText("Modifier la fiche")).toBeNull();
    expect(screen.queryByText("Supprimer")).toBeNull();
    expect(screen.queryByLabelText("Note de lecture")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByText("Dune")).toBeTruthy();
  });

  it("les montre toutes a un titulaire", () => {
    renderRecord(false);

    expect(screen.getByText("Modifier la fiche")).toBeTruthy();
    expect(screen.getByLabelText("Note de lecture")).toBeTruthy();
  });
});
```
(Check `services/queryKeys.ts` for the exact key helper names — `bookKeys.detail` exists per `useToggleBook.test.tsx`; confirm the notes key helper name and adjust.)

- [ ] **Step 2: Run** — `npx jest components features/books/__tests__/BookRecord.readonly.test.tsx`. Expected: FAIL (props unknown / controls rendered).

- [ ] **Step 3: Implement**

`ToggleControl.tsx` — add `readOnly?: boolean` to Props; before the `TouchableRipple` return:
```tsx
if (readOnly) {
  // The state is still shown, as a fact rather than a control: a reader
  // account sees what the team decided without being offered to change it.
  return (
    <View accessibilityLabel={`${name} : ${label}`} style={[styles.control, checked ? styles.on : styles.off]}>
      {content}
    </View>
  );
}
```
where `content` is the existing inner `<View style={styles.content}>…</View>` hoisted into a `const`.

`BookDetail.tsx` — `readOnly = false` prop, passed to both `ToggleControl`s.

`BookRow.tsx` — `readOnly = false` prop; heart slot becomes:
```tsx
<View style={styles.heart}>
  {readOnly ? (
    book.favori ? (
      <View accessibilityLabel="Coup de coeur" style={styles.staticHeart}>
        <Icon size={22} source="heart" color={colors.accent} />
      </View>
    ) : null
  ) : (
    <FavouriteButton favourite={book.favori} title={book.titre} onToggle={() => onToggleFavourite(book)} />
  )}
</View>
```
(`Icon` from react-native-paper, `useAppTheme` for `colors`; `staticHeart: { alignItems: "center", height: 44, justifyContent: "center", width: 44 }`.) `memo` comparison is unaffected: `readOnly` is a primitive.

`BookListEmpty.tsx` — `onCreate?: () => void`; `action={onCreate === undefined ? undefined : { label: "Ajouter un ouvrage", onPress: onCreate }}`.

`NoteRow.tsx` — `onDelete?: (id: string) => void`; render the delete button only when `!sending && onDelete !== undefined`; in the confirm handler call `onDelete?.(note.id)`.

`NoteSection.tsx` — `readOnly = false` prop; `{readOnly ? null : <NoteComposer … />}`; `onDelete={readOnly ? undefined : deletion.mutate}`.

`BookList.tsx` — `onCreate?: () => void`, `readOnly = false`; pass `readOnly` to `BookRow` (add to `renderItem` deps), `onCreate` through to `BookListEmpty`.

`BookRecord.tsx` — `readOnly = false` prop; `<BookDetail readOnly={readOnly} …/>`, `<NoteSection bookId={book.id} readOnly={readOnly} />`, and `{readOnly ? null : <View style={styles.actions}>…</View>}`. The `Dialog` and `UndoBar` can stay: they only open from the hidden buttons.

`app/(app)/index.tsx`:
```tsx
const { peutEcrire } = useSession();
…
headerRight: () => (
  <HeaderActions>
    {peutEcrire ? (
      <Button accessibilityLabel="Ajouter" mode="text" icon="plus" onPress={create}>Ajouter</Button>
    ) : null}
  </HeaderActions>
),
…
<BookList onOpen={open} onCreate={peutEcrire ? create : undefined} readOnly={!peutEcrire} />
```

`app/(app)/books/[id]/index.tsx` — `const { peutEcrire } = useSession();` and `readOnly={!peutEcrire}` on `BookRecord`.

`app/(app)/books/new.tsx` and `[id]/edit.tsx` — first lines of the component:
```tsx
const { peutEcrire } = useSession();
// A reader account reaching this URL by hand gets the collection, not a form
// the server would refuse anyway.
if (!peutEcrire) return <Redirect href="/" />;
```
(`Redirect` from expo-router; hooks must be called before the early return — put `useRouter`/`useLocalSearchParams` above it.)

- [ ] **Step 4: Run** — `npx jest && npm run typecheck && npm run lint`. Expected: green.

- [ ] **Step 5: Manual check** — sign in as `lecteur@booklist.fr / lecteur123`: no "Ajouter", no hearts as switches, record shows "Lu"/"Non lu" as text, no composer, no "Modifier"/"Supprimer"; `/books/new` bounces to `/`. Sign in as editeur: everything back.

- [ ] **Step 6: Commit** — `feat(roles): hide every write control from a reader account`

---

### Task 12: End-to-end — seeded session, auth journeys, existing specs

**Files:**
- Modify: `e2e/support/api.ts`, `e2e/book-list.spec.ts`, `e2e/notes-and-favourites.spec.ts`, `e2e/search-and-filters.spec.ts`
- Create: `e2e/auth.spec.ts`

- [ ] **Step 1: Session helper** — append to `e2e/support/api.ts`:
```ts
export type Role = 'editeur' | 'lecteur';

/**
 * A session already open, the way a till finds it in the morning: the tokens
 * and the profile are in localStorage before the first script runs. The token
 * values are arbitrary — the mocked API never checks them.
 */
export async function signedIn(page: Page, role: Role = 'editeur'): Promise<void> {
  await page.addInitScript((r: Role) => {
    window.localStorage.setItem('booklist.jeton.acces', 'acces-de-test');
    window.localStorage.setItem('booklist.jeton.rafraichissement', 'rafraichissement-de-test');
    window.localStorage.setItem(
      'booklist.session.utilisateur',
      JSON.stringify({ id: `u-${r}`, email: `${r}@booklist.fr`, role: r }),
    );
  }, role);
}

/** Serves the login route for the two demo accounts. */
export async function mockLogin(page: Page): Promise<void> {
  await page.route('**/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email: string; motDePasse: string };
    const role: Role | null =
      body.email === 'editeur@booklist.fr' && body.motDePasse === 'editeur123'
        ? 'editeur'
        : body.email === 'lecteur@booklist.fr' && body.motDePasse === 'lecteur123'
          ? 'lecteur'
          : null;

    if (role === null) {
      return route.fulfill({ status: 401, json: { erreur: 'identifiants_invalides', message: 'Email ou mot de passe incorrect.' } });
    }

    await route.fulfill({
      json: {
        accessToken: 'acces-de-test',
        refreshToken: 'rafraichissement-de-test',
        expiresIn: '120s',
        utilisateur: { id: `u-${role}`, email: body.email, role },
      },
    });
  });
}
```

- [ ] **Step 2: Existing specs** — in each of the three existing spec files add, right after the imports: `test.beforeEach(async ({ page }) => { await signedIn(page); });` and import `signedIn` from `./support/api` (in `book-list.spec.ts` add the import; its local `book()` helper stays).

- [ ] **Step 3: `e2e/auth.spec.ts`**:
```ts
import { expect, test } from '@playwright/test';

import { book, mockCollection, mockLogin, mockRecord, openBookList, openRecord, signedIn } from './support/api';

/**
 * Batch 4.1 on target no. 1: the login gate, the return to the requested
 * screen, the reader account, and the invisible token refresh.
 */

test.describe('The login gate', () => {
  test('sends an anonymous visitor to the login, then back where they were going', async ({ page }) => {
    await mockLogin(page);
    await mockCollection(page);

    await page.goto('/books/new');
    await expect(page).toHaveURL(/\/connexion\?retour=%2Fbooks%2Fnew/);

    await page.getByLabel('Email').fill('editeur@booklist.fr');
    await page.getByLabel('Mot de passe').fill('editeur123');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/books\/new$/);
    await expect(page.getByLabel('Titre')).toBeVisible();
  });

  test('says when the credentials are refused and keeps the email', async ({ page }) => {
    await mockLogin(page);

    await page.goto('/connexion');
    await page.getByLabel('Email').fill('editeur@booklist.fr');
    await page.getByLabel('Mot de passe').fill('faux');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByText(/Email ou mot de passe incorrect/)).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue('editeur@booklist.fr');
  });

  test('signs out from the account menu', async ({ page }) => {
    await signedIn(page);
    await mockCollection(page);

    await openBookList(page);
    await page.getByLabel('Compte : editeur@booklist.fr').click();
    await page.getByText('Se deconnecter').click();

    await expect(page).toHaveURL(/\/connexion/);
  });
});

test.describe('A reader account', () => {
  test('sees no write action anywhere', async ({ page }) => {
    await signedIn(page, 'lecteur');
    await mockCollection(page);
    await mockRecord(page, []);

    await openBookList(page);
    await expect(page.getByRole('button', { name: 'Ajouter' })).toHaveCount(0);
    await expect(page.getByRole('switch')).toHaveCount(0);

    await page.getByText('Ouvrage 1', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Notes de lecture' })).toBeVisible();
    await expect(page.getByLabel('Note de lecture')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Modifier la fiche' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Supprimer' })).toHaveCount(0);
    await expect(page.getByRole('switch')).toHaveCount(0);
  });

  test('is turned away from the creation form', async ({ page }) => {
    await signedIn(page, 'lecteur');
    await mockCollection(page);

    await page.goto('/books/new');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('The expired token', () => {
  test('is refreshed once, invisibly, even for two requests at the same time', async ({ page }) => {
    await signedIn(page);
    let refreshes = 0;
    const bearers: string[] = [];

    await page.route('**/auth/refresh', async (route) => {
      refreshes += 1;
      await route.fulfill({ json: { accessToken: 'acces-neuf', expiresIn: '120s' } });
    });

    // The record and its notes both leave at once; both are refused first.
    const expireOnce = async (route: import('@playwright/test').Route, json: unknown) => {
      const bearer = route.request().headers()['authorization'] ?? '';
      bearers.push(bearer);
      if (bearer !== 'Bearer acces-neuf') {
        return route.fulfill({ status: 401, json: { erreur: 'jeton_expire', message: 'Jeton expire.' } });
      }
      await route.fulfill({ json });
    };

    await mockCollection(page);
    await page.route('**/books/l-1', (route) => expireOnce(route, book(1)));
    await page.route('**/books/l-1/notes', (route) => expireOnce(route, []));

    await openRecord(page);

    await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
    expect(refreshes).toBe(1);
    expect(bearers.filter((b) => b === 'Bearer acces-de-test')).toHaveLength(2);
    expect(bearers.filter((b) => b === 'Bearer acces-neuf')).toHaveLength(2);
    await expect(page).not.toHaveURL(/connexion/);
  });

  test('ends the session when the refresh itself is refused', async ({ page }) => {
    await signedIn(page);
    await page.route('**/auth/refresh', (route) =>
      route.fulfill({ status: 401, json: { erreur: 'refresh_invalide' } }),
    );
    await page.route('**/books?**', (route) =>
      route.fulfill({ status: 401, json: { erreur: 'jeton_expire' } }),
    );

    await page.goto('/');

    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.getByText('Votre session a expire. Reconnectez-vous.')).toBeVisible();
  });
});
```

- [ ] **Step 4: Run** — `npm run build:web && npm run test:e2e`. Expected: all specs pass (old ones through `signedIn`, new `auth.spec.ts`). If a route pattern in `mockCollection` (`**/books?**`) does not match on the second, replayed request, it does — Playwright routes match every request; check `traffic.urls` when in doubt.

- [ ] **Step 5: Commit** — `test(e2e): login gate, reader account and invisible refresh`

---

### Task 13: Documentation

**Files:**
- Create: `docs/ADR/ADR006.md`
- Modify: `README.md`

- [ ] **Step 1: ADR 006** — same layout as ADR 005 (Statut / Contexte / Options / Décision / Conséquences). Content: (1) token storage: secure-store native, localStorage web; options turned down: sessionStorage (re-login every morning), memory (re-login on every reload), httpOnly cookie (API is bearer-only); risk: XSS-readable, mitigations (no HTML injection, 120 s access TTL, refresh token never in React state or logs). (2) refresh policy: reactive on `jeton_expire` only, single-flight, one replay, refresh 401 ⇒ session lost; network failure ⇒ tokens kept, standard retry. (3) login always required regardless of `authRequise`. (4) profile in plain storage, no `/me` at boot.

- [ ] **Step 2: README** — under "Démarrer": `npm run auth` is now the mode to use (the app always asks for a login); table of the two demo accounts; "Recette 4.1" bullet list: leave the app open > 2 min then act — no login screen; ten simultaneous 401 ⇒ one `/auth/refresh` (visible in the Network tab); reader account ⇒ no write control. Under "Tests": the new suites (`services/auth/__tests__`, `features/session/__tests__`, `e2e/auth.spec.ts`).

- [ ] **Step 3: Full verification** — `npm run lint && npm run typecheck && npm run test:coverage && npm run build:web && npm run test:e2e`. Report the actual output.

- [ ] **Step 4: Commit** — `docs: ADR 006 token storage and refresh policy; README demo accounts`

---

## Self-review

- **Spec coverage:** §4.1 storage → T3; §4.2 vault → T4; §4.3 interceptor + client → T1, T5; §4.4 routes/domain → T2, T6; §4.5 provider → T8; §4.6 routing → T10 (+ new/edit redirects in T11); §4.7 login form → T9; §4.8 account menu → T10; §4.9 roles → T11; §4.10 messages → T7; §5 error flows → T4/T5 tests + e2e T12; §6 tests → T2–T12; §7 docs → T13; §8 line budget → check `wc -l` at T13 (`client.ts` shrinks, `BookRecord.tsx` ≈ 155, `ConnexionForm.tsx` ≈ 120).
- **Deviation from spec, on purpose:** `sendOnce` moved to `services/api/transport.ts` to avoid a `client → intercepteur → jetons → client` import cycle. Spec §4.3 wording ("between `send()` and `sendOnce()`") still holds.
- **Type consistency:** `Session`/`SessionState` (T8) used by T9–T11; `RequestOptions.auth` (T1) used by T5, T6; `surSessionPerdue` returns an unsubscribe (T4) — matches the `useEffect` cleanup in T8; `retourSur(unknown)` (T2) accepts `string | string[] | undefined` from `useLocalSearchParams` (T10).
