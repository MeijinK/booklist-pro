import { expect, type Page } from '@playwright/test';

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

  await page.route('**/books/l-1', (route) => route.fulfill({ json: entry }));

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
