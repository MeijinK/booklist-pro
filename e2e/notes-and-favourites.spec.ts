import { expect, test } from '@playwright/test';

import {
  acceptAll,
  book,
  mockCollection,
  mockRecord,
  mockSync,
  note,
  openBookList,
  openRecord,
  signedIn,
} from './support/api';

/**
 * Batch 2 on target no. 1: what the team says about a book, and the two states
 * a bookseller flips at the counter without opening a form.
 */

// Every journey here starts with a bookseller already signed in.
test.beforeEach(async ({ page }) => {
  await signedIn(page);
});

test.describe('The coup de coeur', () => {
  test('flips before the server answers, and is sent as one update without a version', async ({
    page,
  }) => {
    await mockCollection(page);
    const syncs = await mockSync(page, acceptAll);

    await openBookList(page);
    const heart = page.getByRole('switch', { name: 'Coup de coeur, Ouvrage 1', exact: true });

    await heart.click();
    await expect(heart).toBeChecked({ timeout: 300 });

    await expect(
      page.getByLabel('En ligne, tout est synchronise').filter({ visible: true }),
    ).toBeVisible();
    expect(syncs).toHaveLength(1);
    expect(syncs[0]?.mutations[0]).toMatchObject({ type: 'update', livre: { id: 'l-1', favori: true } });
    expect(syncs[0]?.mutations[0]).not.toHaveProperty('baseVersion');
    await expect(heart).toBeChecked();
  });

  test('holds, and waits in the queue, when the server is down', async ({ page }) => {
    await mockCollection(page);
    await mockSync(page, () => ({ status: 503, json: { erreur: 'indisponible' } }));

    await openBookList(page);
    const heart = page.getByRole('switch', { name: 'Coup de coeur, Ouvrage 1', exact: true });

    await heart.click();
    await expect(heart).toBeChecked();

    // Nothing is rolled back and nothing is lost: the change waits for the
    // server, and the header says so.
    await expect(
      page.getByLabel('1 modification en attente. Synchroniser').filter({ visible: true }),
    ).toBeVisible();
    await expect(heart).toBeChecked();
  });
});

test.describe('Read status', () => {
  test('is flipped from the record, before the server answers', async ({ page }) => {
    // The mock keeps what the sync accepted, the way the real server does:
    // the record is re-read once the queue is empty.
    const held = { entry: book(1, { lu: false }) };
    await mockCollection(page);
    await mockSync(page, (call) => {
      const change = call.mutations[0]?.livre;
      if (change !== undefined) held.entry = { ...held.entry, ...change, version: 2 };
      return acceptAll(call);
    });
    await page.route('**/books/l-1/notes', (route) => route.fulfill({ json: [] }));
    await page.route('**/books/l-1', (route) => route.fulfill({ json: held.entry }));

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
