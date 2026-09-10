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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run serve:web',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
