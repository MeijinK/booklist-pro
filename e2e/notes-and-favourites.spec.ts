import { expect, test } from '@playwright/test';

import { book, mockCollection, mockRecord, note, openBookList, openRecord } from './support/api';

/**
 * Batch 2 on target no. 1: what the team says about a book, and the two states
 * a bookseller flips at the counter without opening a form.
 */

test.describe('The coup de coeur', () => {
  test('flips before the server answers, and holds when it accepts', async ({ page }) => {
    await mockCollection(page);
    await page.route('**/books/l-1', async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      // Slow on purpose: the heart must have flipped well before this returns.
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ json: book(1, { favori: true, version: 2 }) });
    });

    await openBookList(page);
    const heart = page.getByRole('switch', { name: 'Coup de coeur, Ouvrage 1', exact: true });

    await heart.click();
    await expect(heart).toBeChecked({ timeout: 300 });
    await expect(heart).toBeChecked();
  });

  test('comes back, and says so, when the server refuses', async ({ page }) => {
    await mockCollection(page);
    await page.route('**/books/l-1', async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      await route.fulfill({ status: 503, json: { erreur: 'indisponible' } });
    });

    await openBookList(page);
    const heart = page.getByRole('switch', { name: 'Coup de coeur, Ouvrage 1', exact: true });

    await heart.click();
    await expect(heart).toBeChecked();

    await expect(page.getByText(/Le serveur a refuse ce coup de coeur/)).toBeVisible();
    await expect(heart).not.toBeChecked();
  });
});

test.describe('Read status', () => {
  test('is flipped from the record, before the server answers', async ({ page }) => {
    await mockCollection(page);
    await page.route('**/books/l-1/notes', (route) => route.fulfill({ json: [] }));
    await page.route('**/books/l-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({ json: book(1, { lu: true, version: 2 }) });
      }
      return route.fulfill({ json: book(1, { lu: false }) });
    });

    await openRecord(page);
    const status = page.getByRole('switch', { name: 'Statut de lecture' });

    await expect(status).not.toBeChecked();
    await status.click();
    await expect(status).toBeChecked();
  });
});

test.describe('Reading notes', () => {
  const NOTES = 'Notes de lecture';

  test('shows the notes of a book, stamped and most recent first', async ({ page }) => {
    await mockCollection(page);
    await mockRecord(page, [
      note('n-1', 'Traduction inegale.', '2026-07-28T09:40:06.361Z'),
      note('n-2', 'Construction du monde remarquable.', '2026-07-10T09:40:06.361Z'),
    ]);

    await openRecord(page);
    const notes = page.getByRole('list', { name: NOTES });

    await expect(notes.getByText('Traduction inegale.')).toBeVisible();
    await expect(notes.getByText(/28 juillet 2026 a \d{2}:\d{2}/)).toBeVisible();
  });

  test('adds a note and shows it without waiting for a reload', async ({ page }) => {
    await mockCollection(page);
    await mockRecord(page, []);

    await openRecord(page);
    await expect(page.getByText('Aucune note pour cet ouvrage')).toBeVisible();

    await page.getByLabel('Note de lecture').fill('A conseiller aux lecteurs de Damasio.');
    await page.getByRole('button', { name: 'Ajouter la note' }).click();

    // Scoped to the list: the composer still holds the same text for the
    // instant the note takes to travel, and both would match otherwise.
    const notes = page.getByRole('list', { name: NOTES });
    await expect(notes.getByText('A conseiller aux lecteurs de Damasio.')).toBeVisible();
    await expect(page.getByLabel('Note de lecture')).toHaveValue('');
  });

  test('refuses an empty note without troubling the server', async ({ page }) => {
    await mockCollection(page);
    await mockRecord(page, []);

    await openRecord(page);
    await page.getByRole('button', { name: 'Ajouter la note' }).click();

    await expect(page.getByText('Une note de lecture ne peut pas etre vide.')).toBeVisible();
  });

  test('asks before removing a note, on the row itself', async ({ page }) => {
    await mockCollection(page);
    await mockRecord(page, [note('n-1', 'Traduction inegale.', '2026-07-28T09:40:06.361Z')]);

    await openRecord(page);
    await page.getByRole('button', { name: /Supprimer la note du/ }).click();

    await expect(page.getByText('Retirer cette note du cahier ?')).toBeVisible();
    await page.getByRole('button', { name: 'Retirer' }).click();

    await expect(page.getByRole('list', { name: NOTES })).toContainText(
      'Aucune note pour cet ouvrage',
    );
  });

  test('keeps the note when the deletion is called off', async ({ page }) => {
    await mockCollection(page);
    await mockRecord(page, [note('n-1', 'Traduction inegale.', '2026-07-28T09:40:06.361Z')]);

    await openRecord(page);
    await page.getByRole('button', { name: /Supprimer la note du/ }).click();
    await page.getByRole('button', { name: 'Conserver' }).click();

    await expect(page.getByText('Retirer cette note du cahier ?')).toBeHidden();
    await expect(page.getByRole('list', { name: NOTES })).toContainText('Traduction inegale.');
  });
});
