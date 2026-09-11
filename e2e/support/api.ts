import { expect, type Page, type Route } from '@playwright/test';

/**
 * The API, simulated by network interception.
 *
 * The tests are about the application, not about the demo server: an
 * acceptance run that fails because port 3000 is busy teaches nothing about the
 * delivered code. What the mock does answer, it answers the way the contract
 * says, query string included.
 */

export type BookRecord = {
  id: string;
  titre: string;
  auteur: string;
  editeur: string;
  annee: number;
  lu: boolean;
  favori: boolean;
  note: number | null;
  couverture: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type NoteRecord = {
  id: string;
  livreId: string;
  contenu: string;
  createdAt: string;
};

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const LIMIT = 20;
export const SEARCH_LABEL = 'Rechercher un ouvrage par titre ou par auteur';

export function book(index: number, overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    id: `l-${index}`,
    titre: `Ouvrage ${index}`,
    auteur: `Auteur ${index}`,
    editeur: 'La Volte',
    annee: 2000 + (index % 20),
    lu: index % 3 === 0,
    favori: false,
    note: null,
    couverture: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    version: 1,
    ...overrides,
  };
}

export function note(id: string, contenu: string, createdAt: string): NoteRecord {
  return { id, livreId: 'l-1', contenu, createdAt };
}

/** Every collection request the application actually sent. */
export type Traffic = { urls: URL[] };

/** The query string of the most recent collection request. */
export function lastQuery(traffic: Traffic): URLSearchParams {
  return traffic.urls[traffic.urls.length - 1]?.searchParams ?? new URLSearchParams();
}

/**
 * Serves the collection, and records what was asked of it.
 *
 * The server is the one that filters, sorts and paginates: the mock answers
 * whatever the query string says, so a test asserting on a filter asserts on
 * what left the application, not on what the interface hid afterwards.
 */
export async function mockCollection(page: Page, total = 45): Promise<Traffic> {
  const traffic: Traffic = { urls: [] };

  await page.route('**/books?**', async (route) => {
    const url = new URL(route.request().url());
    traffic.urls.push(url);

    const query = url.searchParams.get('q') ?? '';
    const matching = query.toLowerCase().includes('zzz') ? 0 : total;
    const pageNumber = Number(url.searchParams.get('page') ?? '1');
    const start = (pageNumber - 1) * LIMIT;
    const favouritesOnly = url.searchParams.get('favori') === 'true';

    const items = Array.from(
      { length: Math.max(0, Math.min(LIMIT, matching - start)) },
      (_, offset) => book(start + offset + 1, { favori: favouritesOnly }),
    );

    await route.fulfill({
      json: {
        items,
        page: pageNumber,
        limit: LIMIT,
        total: matching,
        totalPages: Math.ceil(matching / LIMIT),
      },
    });
  });

  return traffic;
}

/**
 * Serves one record and its notes, and keeps them: a note added by the test is
 * a note the next read returns, the way the real server behaves.
 */
export async function mockRecord(page: Page, notes: NoteRecord[], entry = book(1)): Promise<void> {
  const held = [...notes];

  await page.route('**/books/l-1', (route) =>
    // The same path is also a page of the application: a reload must reach
    // the static server, not the mock.
    route.request().resourceType() === 'document'
      ? route.fallback()
      : route.fulfill({ json: entry }),
  );

  await page.route('**/books/l-1/notes', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { contenu: string };
      const created = note('n-new', body.contenu, '2026-09-10T11:00:00.000Z');
      held.unshift(created);
      return route.fulfill({ status: 201, json: created });
    }

    return route.fulfill({ json: held });
  });

  await page.route('**/books/l-1/notes/*', async (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();

    const id = new URL(route.request().url()).pathname.split('/').pop();
    const index = held.findIndex((entry) => entry.id === id);
    if (index >= 0) held.splice(index, 1);

    await route.fulfill({ status: 204, body: '' });
  });
}

/** Opens the list and waits until the application is genuinely interactive. */
export async function openBookList(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText(/ouvrages? sur \d+|Le fonds est vide|momentanement/)).toBeVisible();
}

/**
 * Reaches a record through the list, like a bookseller would: the dynamic route
 * does not exist as a file in the static export.
 */
export async function openRecord(page: Page): Promise<void> {
  await openBookList(page);
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Notes de lecture' })).toBeVisible();
}

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
      return route.fulfill({
        status: 401,
        json: { erreur: 'identifiants_invalides', message: 'Email ou mot de passe incorrect.' },
      });
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

export type SyncMutation = {
  id: string;
  type: 'create' | 'update' | 'delete';
  livre?: Record<string, unknown>;
  livreId?: string;
  baseVersion?: number;
};

export type SyncCall = { bearer: string; mutations: SyncMutation[] };

export type SyncAnswer = { status?: number; json: unknown };

/**
 * POST /sync, answered by a handler the test controls. Every call is recorded
 * with the bearer it carried, so a test can assert the same ids came back
 * after a refresh.
 */
export async function mockSync(
  page: Page,
  answer: (call: SyncCall, index: number) => SyncAnswer,
): Promise<SyncCall[]> {
  const calls: SyncCall[] = [];

  await page.route('**/sync', async (route) => {
    const body = route.request().postDataJSON() as { mutations: SyncMutation[] };
    const call = { bearer: route.request().headers()['authorization'] ?? '', mutations: body.mutations };
    calls.push(call);
    const { status = 200, json } = answer(call, calls.length - 1);
    await route.fulfill({ status, json });
  });

  return calls;
}

/** The server accepts everything: each mutation echoes a plausible record. */
export function acceptAll(call: SyncCall): SyncAnswer {
  return {
    json: {
      resultats: call.mutations.map((m) => {
        if (m.type === 'delete') return { id: m.id, statut: 'ok' };
        const id = m.type === 'create' ? `srv-${m.id.slice(0, 8)}` : String(m.livre?.id);
        return { id: m.id, statut: 'ok', livre: book(1, { ...m.livre, id, version: 2 }) };
      }),
      resume: {},
      serveurLe: TIMESTAMP,
    },
  };
}

/** Serves one record whose current version the test can change mid-run. */
export async function mockRecordMutable(
  page: Page,
  notes: NoteRecord[],
  holder: { entry: BookRecord },
): Promise<void> {
  await mockRecord(page, notes, holder.entry);
  await page.route('**/books/l-1', (route) =>
    route.request().method() === 'GET' && route.request().resourceType() !== 'document'
      ? route.fulfill({ json: holder.entry })
      : route.fallback(),
  );
}

export async function mockStats(page: Page): Promise<void> {
  await page.route('**/stats', (route) =>
    route.request().resourceType() === 'document'
      ? route.fallback()
      : route.fulfill({
      json: {
        total: 45,
        lus: 15,
        nonLus: 30,
        favoris: 3,
        moyenneNotes: 3.8,
        totalNotes: 12,
        distributionNotes: [
          { note: 3, total: 4 },
          { note: 5, total: 8 },
        ],
        parAnnee: [
          { annee: 2001, total: 20 },
          { annee: 2002, total: 25 },
        ],
        parAuteur: [],
        genereLe: TIMESTAMP,
      },
    }),
  );
}

const STATIC_HOST = '127.0.0.1:8082';
const OFFLINE_FLAG = 'e2e.offline';

const abortOffline = (route: Route) => route.abort('internetdisconnected');
const notStatic = (url: URL) => url.host !== STATIC_HOST;

/**
 * The shop's connection drops, the way a till sees it: every request to the
 * API fails, `navigator.onLine` says so, the browser fires `offline`. The
 * static server stays reachable, so the page can still be reloaded — which is
 * exactly what the persisted cache and the queue are there for. The flag in
 * sessionStorage keeps the browser offline across that reload.
 */
export async function goOffline(page: Page): Promise<void> {
  await page.route(notStatic, abortOffline);
  await page.addInitScript((flag: string) => {
    if (window.sessionStorage.getItem(flag) === '1') {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    }
  }, OFFLINE_FLAG);
  await page.evaluate((flag: string) => {
    window.sessionStorage.setItem(flag, '1');
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
  }, OFFLINE_FLAG);
}

export async function goOnline(page: Page): Promise<void> {
  await page.unroute(notStatic, abortOffline);
  await page.evaluate((flag: string) => {
    window.sessionStorage.removeItem(flag);
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    window.dispatchEvent(new Event('online'));
  }, OFFLINE_FLAG);
}

/** The one instance of a header control that is on screen, stacked screens aside. */
export function visible(page: Page, label: string) {
  return page.getByLabel(label).filter({ visible: true });
}
