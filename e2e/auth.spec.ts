import { expect, test, type Route } from '@playwright/test';

import {
  book,
  mockCollection,
  mockLogin,
  mockRecord,
  openBookList,
  openRecord,
  signedIn,
} from './support/api';

/**
 * Batch 4.1 on target no. 1: the login gate, the return to the requested
 * screen, the reader account, and the invisible token refresh.
 */

test.describe('The login gate', () => {
  test('sends an anonymous visitor to the login, then back where they were going', async ({
    page,
  }) => {
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
    await page.getByRole('menuitem', { name: 'Se deconnecter' }).click();

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
  test('is refreshed once, invisibly, and the new token serves what follows', async ({
    page,
  }) => {
    await signedIn(page);
    let refreshes = 0;
    const bearers: string[] = [];

    await page.route('**/auth/refresh', async (route) => {
      refreshes += 1;
      await route.fulfill({ json: { accessToken: 'acces-neuf', expiresIn: '120s' } });
    });

    // Refuses the old token, accepts the new one: the record is refused first,
    // and the notes — which leave once the record is on screen — must already
    // carry the refreshed token without a second round trip.
    const expireOnce = async (route: Route, json: unknown) => {
      const bearer = route.request().headers()['authorization'] ?? '';
      bearers.push(bearer);
      if (bearer !== 'Bearer acces-neuf') {
        return route.fulfill({
          status: 401,
          json: { erreur: 'jeton_expire', message: 'Jeton expire.' },
        });
      }
      await route.fulfill({ json });
    };

    await mockCollection(page);
    await page.route('**/books/l-1', (route) => expireOnce(route, book(1)));
    await page.route('**/books/l-1/notes', (route) => expireOnce(route, []));

    await openRecord(page);

    // Both replays landed: the record is on screen and the notes answered.
    await expect(page.getByText('Aucune note pour cet ouvrage')).toBeVisible();
    expect(refreshes).toBe(1);
    expect(bearers[0]).toBe('Bearer acces-de-test');
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
