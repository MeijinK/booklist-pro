import { expect, test, type Page } from '@playwright/test';

import { acceptAll, mockSync, signedIn } from './support/api';

/**
 * Critical journey of batch 1, on target no. 1: the browser.
 *
 * The API is simulated by network interception rather than started alongside:
 * the test is about the application, and an acceptance run that fails because
 * port 3000 is busy teaches nothing about the delivered code.
 */

type BookRecord = {
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

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

function book(index: number): BookRecord {
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
  };
}

const TOTAL = 45;
const LIMIT = 20;

/**
 * Opens the list and waits until the application is genuinely interactive.
 *
 * The static export serves a pre-render: the text is visible before React has
 * taken over, and a click sent too early reaches no handler. The arrival of the
 * collection data proves the bundle is running, since nothing requests it
 * before hydration.
 */
async function openBookList(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText(/ouvrages? sur \d+|Le fonds est vide|momentanement/)).toBeVisible();
}

/** Reaches the creation form through navigation, like a bookseller would. */
async function openBookForm(page: Page): Promise<void> {
  await openBookList(page);
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByLabel('Titre', { exact: true })).toBeVisible();
}

/**
 * The previous screen stays mounted behind the new one: the list row labels
 * ("Ouvrage 3, Auteur 3") collide with the field labels unless the lookup is
 * exact.
 */

/** Serves the collection page by page, the way the API does. */
async function mockApi(page: Page): Promise<void> {
  await page.route('**/books**', async (route) => {
    const url = new URL(route.request().url());
    const pageNumber = Number(url.searchParams.get('page') ?? '1');
    const start = (pageNumber - 1) * LIMIT;

    const items = Array.from({ length: Math.max(0, Math.min(LIMIT, TOTAL - start)) }, (_, offset) =>
      book(start + offset + 1),
    );

    await route.fulfill({
      json: { items, page: pageNumber, limit: LIMIT, total: TOTAL, totalPages: 3 },
    });
  });
}

// Every journey here starts with a bookseller already signed in.
test.beforeEach(async ({ page }) => {
  await signedIn(page);
});

test.describe('The collection', () => {
  test('displays one page of the collection, not the whole collection', async ({ page }) => {
    await mockApi(page);
    await openBookList(page);

    await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
    await expect(page.getByText(`20 ouvrages sur ${TOTAL}`)).toBeVisible();
    await expect(page.getByText('Ouvrage 21', { exact: true })).toHaveCount(0);
  });

  test('loads the next page on an explicit request', async ({ page }) => {
    await mockApi(page);
    await openBookList(page);

    await page.getByRole('button', { name: 'Charger 20 ouvrages de plus' }).click();

    await expect(page.getByText('Ouvrage 21', { exact: true })).toBeVisible();
    await expect(page.getByText(`40 ouvrages sur ${TOTAL}`)).toBeVisible();
  });

  test('offers a creation when the collection is empty', async ({ page }) => {
    await page.route('**/books**', (route) =>
      route.fulfill({ json: { items: [], page: 1, limit: LIMIT, total: 0, totalPages: 0 } }),
    );
    await openBookList(page);

    await expect(page.getByText('Le fonds est vide')).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter un ouvrage' }).click();

    await expect(page.getByLabel('Titre', { exact: true })).toBeVisible();
  });

  test('offers a retry when the server is unavailable', async ({ page }) => {
    await page.route('**/books**', (route) =>
      route.fulfill({ status: 503, json: { erreur: 'indisponible' } }),
    );
    await openBookList(page);

    await expect(page.getByText('Le service est momentanement indisponible')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reessayer' })).toBeVisible();
  });
});

test.describe('The form', () => {
  test('rejects incomplete input, field by field', async ({ page }) => {
    await mockApi(page);
    await openBookForm(page);

    await page.getByRole('button', { name: 'Ajouter au fonds' }).click();

    await expect(page.getByText('Le titre est obligatoire.')).toBeVisible();
    await expect(page.getByText("L'annee de publication est obligatoire.")).toBeVisible();
  });

  test('keeps an entry the server refuses, field errors included', async ({ page }) => {
    await mockApi(page);
    await mockSync(page, (call) => ({
      json: {
        resultats: call.mutations.map((m) => ({
          id: m.id,
          statut: 'erreur',
          champs: { editeur: "Cet editeur n'est pas reference." },
        })),
        resume: {},
      },
    }));

    await openBookForm(page);
    await page.getByLabel('Titre', { exact: true }).fill('Dune');
    await page.getByLabel('Auteur', { exact: true }).fill('Frank Herbert');
    await page.getByLabel('Editeur', { exact: true }).fill('Inconnu');
    await page.getByLabel('Annee de publication', { exact: true }).fill('1965');
    await page.getByRole('button', { name: 'Ajouter au fonds' }).click();

    // The entry left the till and came back refused: it waits, whole, with
    // the server's reason, where the bookseller can copy it back.
    await page.getByLabel('1 conflit a traiter').click();
    await page.getByText('Dune', { exact: true }).click();
    await expect(page.getByText('Le serveur a refuse cette saisie')).toBeVisible();
    await expect(page.getByText(/Cet editeur n'est pas reference/)).toBeVisible();
    await expect(page.getByText('Frank Herbert')).toBeVisible();
  });
});

test.describe('Deletion', () => {
  test('leaves five seconds to change one\'s mind', async ({ page }) => {
    await mockApi(page);
    const syncs = await mockSync(page, acceptAll);
    await page.route('**/books/l-1', (route) => route.fulfill({ json: book(1) }));

    // We go through the list rather than a direct URL: the dynamic route does
    // not exist as a file in the static export.
    await openBookList(page);
    await page.getByText('Ouvrage 1', { exact: true }).click();

    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(page.getByText('Supprimer cet ouvrage ?')).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer definitivement' }).click();

    const undoButton = page.getByRole('button', { name: 'Annuler', exact: true });
    await expect(undoButton).toBeVisible();
    await undoButton.click();
    await expect(undoButton).toBeHidden();

    // Undone before departure: nothing was ever queued, nothing was sent.
    await page.waitForTimeout(6000);
    expect(syncs).toHaveLength(0);
    await expect(
      page.getByLabel('En ligne, tout est synchronise').filter({ visible: true }),
    ).toBeVisible();
  });
});
