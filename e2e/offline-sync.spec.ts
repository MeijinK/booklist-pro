import { expect, test } from '@playwright/test';

import {
  acceptAll,
  book,
  goOffline,
  goOnline,
  mockCollection,
  mockRecordMutable,
  mockSync,
  openBookList,
  signedIn,
  visible,
} from './support/api';

/**
 * The recette of section 4.6, on the browser target: offline creation and
 * edit, a colleague's server-side change, the token expiring meanwhile, the
 * network coming back. One creation, one conflict, nothing lost.
 */
test('recette 4.6 : hors ligne, jeton expire, conflit fusionne, une seule creation', async ({
  page,
}) => {
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
        resultats: call.mutations.map((m) => {
          if (m.type === 'create') {
            return { id: m.id, statut: 'ok', livre: book(99, { id: 'srv-99', titre: String(m.livre?.titre) }) };
          }
          if (m.baseVersion === 2) {
            return { id: m.id, statut: 'ok', livre: book(1, { ...m.livre, version: 3 }) };
          }
          return { id: m.id, statut: 'conflit', serveur: holder.entry, versionAttendue: 2 };
        }),
        resume: {},
        serveurLe: '2026-09-11T10:00:00.000Z',
      },
    };
  });

  await openBookList(page);

  // 1–2. Offline, create a book.
  await goOffline(page);
  await expect(page.getByText('Hors ligne')).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await page.getByLabel('Titre', { exact: true }).fill('Cree hors ligne');
  await page.getByLabel('Auteur', { exact: true }).fill('Moi');
  await page.getByLabel('Editeur', { exact: true }).fill('Maison');
  await page.getByLabel('Annee de publication', { exact: true }).fill('2024');
  await page.getByRole('button', { name: 'Ajouter au fonds' }).click();
  await expect(page.getByText('Cree hors ligne')).toBeVisible();
  await expect(page.getByLabel('1 modification en attente. Synchroniser')).toBeVisible();

  // 3. Edit an existing book offline.
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await page.getByRole('button', { name: 'Modifier la fiche' }).click();
  await page.getByLabel('Titre', { exact: true }).fill('Mon titre');
  await page.getByRole('button', { name: 'Enregistrer les corrections' }).click();
  // Every screen of the stack keeps its header: the first one is the visible one.
  await expect(visible(page, '2 modifications en attente. Synchroniser')).toBeVisible();

  // 4. Meanwhile the server-side change (the trainer's curl).
  holder.entry = book(1, { titre: 'Modifie par le serveur', version: 2 });

  // 5–6. The token has expired (the first /sync answers 401); the network comes back.
  await goOnline(page);

  await expect(visible(page, '1 conflit a traiter')).toBeVisible();
  expect(refreshes).toBe(1);
  expect(syncs).toHaveLength(2);
  expect(syncs[0]?.mutations.map((m) => m.id)).toEqual(syncs[1]?.mutations.map((m) => m.id));
  expect(syncs[1]?.mutations.filter((m) => m.type === 'create')).toHaveLength(1);

  // The bookseller understands and arbitrates.
  await visible(page, '1 conflit a traiter').click();
  await page.getByText('Modifie par le serveur', { exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Cette fiche a ete modifiee par un collegue')).toBeVisible();
  await expect(page.getByText('Votre version : Mon titre')).toBeVisible();
  await expect(page.getByText('Version serveur : Modifie par le serveur')).toBeVisible();
  await page.getByRole('button', { name: 'Appliquer la fusion' }).click();

  await expect(visible(page, 'En ligne, tout est synchronise')).toBeVisible();
  expect(syncs).toHaveLength(3);
  expect(syncs[2]?.mutations[0]).toMatchObject({
    type: 'update',
    baseVersion: 2,
    livre: { id: 'l-1', titre: 'Mon titre' },
  });
});

test('une note ecrite hors ligne survit a un rechargement et part au retour du reseau', async ({
  page,
}) => {
  await signedIn(page);
  await mockCollection(page);
  await mockRecordMutable(page, [], { entry: book(1) });
  await mockSync(page, acceptAll);

  await openBookList(page);
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await expect(page.getByText('Aucune note pour cet ouvrage')).toBeVisible();

  await goOffline(page);
  await page.getByLabel('Note de lecture').fill('Ecrite sans reseau');
  await page.getByRole('button', { name: 'Ajouter la note' }).click();
  const notes = page.getByRole('list', { name: 'Notes de lecture' });
  await expect(notes.getByText('Ecrite sans reseau')).toBeVisible();

  // The record page has no file of its own in the static export: the reload
  // lands on the list, and the record is reached again from there, offline.
  await page.goto('/');
  await expect(visible(page, '1 modification en attente. Synchroniser')).toBeVisible();
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await expect(notes.getByText('Ecrite sans reseau')).toBeVisible();

  await goOnline(page);
  await expect(visible(page, 'En ligne, tout est synchronise')).toBeVisible();
});

test('une note en cours de redaction survit a un rechargement', async ({ page }) => {
  await signedIn(page);
  await mockCollection(page);
  await mockRecordMutable(page, [], { entry: book(1) });

  await openBookList(page);
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await page.getByLabel('Note de lecture').fill('Pas encore envoyee');
  // The draft is written a few hundred milliseconds after the last keystroke.
  await page.waitForTimeout(600);

  await page.goto('/');
  await page.getByText('Ouvrage 1', { exact: true }).click();
  await expect(page.getByLabel('Note de lecture')).toHaveValue('Pas encore envoyee');
});
