import { defineConfig, devices } from '@playwright/test';

// 8081 est le port du serveur de developpement Expo : le garder libre permet
// de lancer la recette e2e sans arreter `npx expo start --web`.
const PORT = 8082;
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Les tests e2e s'exécutent sur la cible n°1 du projet : le navigateur.
 * Ils tournent sur l'export statique (`npm run build:web`), pas sur le serveur de dev,
 * pour tester exactement ce qui est livré et éviter les aléas du bundler à chaud.
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  /**
   * L'export statique sert un pre-rendu de 2,3 Mo : une assertion sur la liste
   * attend en realite l'hydratation du bundle. Elle coute deja 2 a 3 s en serie,
   * et chaque worker hydrate son propre Chromium : les 5 s par defaut de
   * Playwright ne laissent aucune marge des que les tests tournent en parallele.
   * Le cas 503 est le plus juste de tous, le client rejouant la requete trois
   * fois avec attente croissante avant d'afficher l'ecran d'erreur.
   */
  expect: { timeout: 15_000 },
  timeout: 60_000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run serve:web',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
