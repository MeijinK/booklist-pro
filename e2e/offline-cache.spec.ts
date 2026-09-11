import { expect, test } from '@playwright/test';

import { goOffline, mockCollection, mockStats, openBookList, signedIn } from './support/api';

/**
 * The persisted cache: what the till knew before the network dropped stays
 * readable after a reload, dated.
 */
test('la liste et le tableau de bord restent consultables hors ligne apres rechargement', async ({
  page,
}) => {
  await signedIn(page);
  await mockCollection(page);
  await mockStats(page);

  await openBookList(page);
  await page.getByLabel('Tableau de bord').click();
  await expect(page.getByLabel('Lus : 15 sur 45 (33 %)')).toBeVisible();
  await expect(page.getByText(/Mis a jour le/)).toBeVisible();

  // The persisted cache is written a few hundred milliseconds after a change.
  await page.waitForTimeout(800);
  await goOffline(page);
  await page.reload();

  await expect(page.getByText(/Mis a jour le/)).toBeVisible();
  await expect(page.getByLabel('Lus : 15 sur 45 (33 %)')).toBeVisible();
  await expect(page.getByText('Hors ligne', { exact: true }).filter({ visible: true })).toBeVisible();

  // The list too, straight from the cache: fresh enough not to be refetched,
  // hence no banner — the header alone says the shop is offline.
  await page.goto('/');
  await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Hors ligne', { exact: true }).filter({ visible: true })).toBeVisible();
});
