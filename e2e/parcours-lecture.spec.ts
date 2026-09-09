import { expect, test } from '@playwright/test';

/**
 * Parcours critique : un libraire ouvre l'application dans son navigateur,
 * circule entre les onglets et ouvre une fiche en modale sans jamais perdre le contexte.
 * (Sera étendu au parcours « recherche → ajout d'un livre » dès que les lots 1-2 seront livrés.)
 */
test.describe('Parcours navigation', () => {
  test('affiche l’écran d’accueil au démarrage', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Welcome!')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();
  });

  test('navigue de l’accueil vers l’onglet Explore et revient', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: 'Explore' }).click();
    await expect(page.getByText('Explore', { exact: true }).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Home' }).click();
    await expect(page.getByText('Welcome!')).toBeVisible();
  });

  test('ouvre la modale depuis l’accueil et la referme', async ({ page }) => {
    await page.goto('/');

    await page.getByText('Step 2: Explore').click();
    await expect(page.getByText('This is a modal')).toBeVisible();

    await page.getByText('Go to home screen').click();
    await expect(page.getByText('Welcome!')).toBeVisible();
  });
});
