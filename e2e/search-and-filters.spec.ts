import { expect, test } from '@playwright/test';

import { SEARCH_LABEL, lastQuery, mockCollection, openBookList, signedIn } from './support/api';

/**
 * Batch 2 on target no. 1: narrowing five hundred books to the handful that
 * answer a customer's question, without ever narrowing them on the client.
 */

// Every journey here starts with a bookseller already signed in.
test.beforeEach(async ({ page }) => {
  await signedIn(page);
});

test.describe('Search', () => {
  test('sends one request for a word, not one per letter', async ({ page }) => {
    const traffic = await mockCollection(page);
    await openBookList(page);

    const before = traffic.urls.length;
    await page.getByLabel(SEARCH_LABEL).pressSequentially('archipel', { delay: 40 });

    await expect
      .poll(() => traffic.urls.filter((url) => url.searchParams.get('q') === 'archipel').length)
      .toBe(1);

    // Eight letters typed, one request: the anti-rebond of the brief. Anything
    // above two would mean an intermediate search departed as well.
    expect(traffic.urls.length - before).toBeLessThanOrEqual(2);
  });

  test('searches title and author together, server-side', async ({ page }) => {
    const traffic = await mockCollection(page);
    await openBookList(page);

    await page.getByLabel(SEARCH_LABEL).fill('damasio');

    await expect.poll(() => lastQuery(traffic).get('q')).toBe('damasio');
  });

  test('says a search found nothing, and how to get back to the collection', async ({ page }) => {
    await mockCollection(page);
    await openBookList(page);

    await page.getByLabel(SEARCH_LABEL).fill('zzz');

    await expect(page.getByText('Aucun ouvrage ne porte ce titre')).toBeVisible();
    // Not "0 results": the message names what was searched and offers a way out.
    await expect(page.getByText(/« zzz »/)).toBeVisible();

    await page.getByRole('button', { name: 'Afficher tout le fonds' }).click();
    await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
  });

  test('keeps the search bar mounted while the list reloads', async ({ page }) => {
    await mockCollection(page);
    await openBookList(page);

    await page.getByLabel(SEARCH_LABEL).fill('archipel');
    await expect(page.getByLabel(SEARCH_LABEL)).toHaveValue('archipel');

    // A skeleton replacing the whole screen would take the typed text away
    // from a bookseller in the middle of a search.
    await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
    await expect(page.getByLabel(SEARCH_LABEL)).toHaveValue('archipel');
  });
});

test.describe('Filters and sort', () => {
  test('lets the server filter the coups de coeur', async ({ page }) => {
    const traffic = await mockCollection(page);
    await openBookList(page);

    await page.getByLabel('Coups de coeur uniquement, inactif').click();

    await expect.poll(() => lastQuery(traffic).get('favori')).toBe('true');
    await expect(page.getByLabel('Coups de coeur uniquement, actif')).toBeVisible();
  });

  test('lets the server filter on read status', async ({ page }) => {
    const traffic = await mockCollection(page);
    await openBookList(page);

    await page.getByLabel('Statut non lus, inactif').click();
    await expect.poll(() => lastQuery(traffic).get('status')).toBe('nonlu');

    await page.getByLabel('Statut lus, inactif').click();
    await expect.poll(() => lastQuery(traffic).get('status')).toBe('lu');
  });

  test('lets the server sort on the criterion asked for', async ({ page }) => {
    const traffic = await mockCollection(page);
    await openBookList(page);

    await page.getByRole('button', { name: /Trier la liste/ }).click();
    await page.getByRole('menuitem', { name: 'Annee de publication' }).click();

    await expect.poll(() => lastQuery(traffic).get('sort')).toBe('annee');
    // The control states what is in force, without having to be opened again.
    await expect(page.getByText('Annee de publication, croissant')).toBeVisible();
  });

  test('lets the server reverse the order', async ({ page }) => {
    const traffic = await mockCollection(page);
    await openBookList(page);

    await page.getByRole('button', { name: /Trier la liste/ }).click();
    await page.getByRole('menuitem', { name: 'Ordre decroissant' }).click();

    await expect.poll(() => lastQuery(traffic).get('order')).toBe('desc');
  });

  test('keeps paginating under a filter, page by page', async ({ page }) => {
    await mockCollection(page);
    await openBookList(page);

    await page.getByLabel('Statut lus, inactif').click();
    await expect(page.getByText('20 ouvrages sur 45')).toBeVisible();

    await page.getByRole('button', { name: 'Charger 20 ouvrages de plus' }).click();

    // A filter never turns into "load everything and sort afterwards".
    await expect(page.getByText('40 ouvrages sur 45')).toBeVisible();
  });
});
