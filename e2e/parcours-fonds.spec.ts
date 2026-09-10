import { expect, test, type Page } from '@playwright/test';

/**
 * Parcours critique du lot 1, sur la cible n°1 : le navigateur.
 *
 * L'API est simulée par interception réseau plutôt que lancée à côté : le test
 * porte sur l'application, et une recette qui échoue parce que le port 3000
 * est occupé n'apprend rien sur le code livré.
 */

type Ouvrage = {
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

const HORODATAGE = '2026-01-01T00:00:00.000Z';

function ouvrage(indice: number): Ouvrage {
  return {
    id: `l-${indice}`,
    titre: `Ouvrage ${indice}`,
    auteur: `Auteur ${indice}`,
    editeur: 'La Volte',
    annee: 2000 + (indice % 20),
    lu: indice % 3 === 0,
    favori: false,
    note: null,
    couverture: null,
    createdAt: HORODATAGE,
    updatedAt: HORODATAGE,
    version: 1,
  };
}

const TOTAL = 45;
const LIMITE = 20;

/**
 * Ouvre la liste et attend que l'application soit reellement interactive.
 *
 * L'export statique sert un rendu prealable : le texte est visible avant que
 * React n'ait repris la main, et un clic envoye trop tot n'atteint aucun
 * gestionnaire. L'arrivee des donnees du fonds prouve que le bundle tourne,
 * puisque rien ne les demande avant l'hydratation.
 */
async function ouvrirLeFonds(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText(/ouvrages? sur \d+|Le fonds est vide|momentanement/)).toBeVisible();
}

/** Rejoint le formulaire de creation par la navigation, comme un libraire. */
async function ouvrirLeFormulaire(page: Page): Promise<void> {
  await ouvrirLeFonds(page);
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByLabel('Titre', { exact: true })).toBeVisible();
}

/**
 * L'ecran precedent reste monte derriere le nouveau : les libelles des lignes
 * de liste (« Ouvrage 3, Auteur 3 ») croisent ceux des champs si la recherche
 * n'est pas exacte.
 */

/** Sert le fonds page par page, comme le fait l'API. */
async function simulerApi(page: Page): Promise<void> {
  await page.route('**/books**', async (route) => {
    const url = new URL(route.request().url());
    const numero = Number(url.searchParams.get('page') ?? '1');
    const debut = (numero - 1) * LIMITE;

    const items = Array.from(
      { length: Math.max(0, Math.min(LIMITE, TOTAL - debut)) },
      (_, decalage) => ouvrage(debut + decalage + 1),
    );

    await route.fulfill({
      json: { items, page: numero, limit: LIMITE, total: TOTAL, totalPages: 3 },
    });
  });
}

test.describe('Le fonds', () => {
  test('affiche une page du fonds, pas le fonds entier', async ({ page }) => {
    await simulerApi(page);
    await ouvrirLeFonds(page);

    await expect(page.getByText('Ouvrage 1', { exact: true })).toBeVisible();
    await expect(page.getByText(`20 ouvrages sur ${TOTAL}`)).toBeVisible();
    await expect(page.getByText('Ouvrage 21', { exact: true })).toHaveCount(0);
  });

  test('charge la page suivante sur demande explicite', async ({ page }) => {
    await simulerApi(page);
    await ouvrirLeFonds(page);

    await page.getByRole('button', { name: 'Charger 20 ouvrages de plus' }).click();

    await expect(page.getByText('Ouvrage 21', { exact: true })).toBeVisible();
    await expect(page.getByText(`40 ouvrages sur ${TOTAL}`)).toBeVisible();
  });

  test('propose une création quand le fonds est vide', async ({ page }) => {
    await page.route('**/books**', (route) =>
      route.fulfill({ json: { items: [], page: 1, limit: LIMITE, total: 0, totalPages: 0 } }),
    );
    await ouvrirLeFonds(page);

    await expect(page.getByText('Le fonds est vide')).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter un ouvrage' }).click();

    await expect(page.getByLabel('Titre', { exact: true })).toBeVisible();
  });

  test('propose de réessayer quand le serveur est indisponible', async ({ page }) => {
    await page.route('**/books**', (route) =>
      route.fulfill({ status: 503, json: { erreur: 'indisponible' } }),
    );
    await ouvrirLeFonds(page);

    await expect(page.getByText('Le service est momentanement indisponible')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reessayer' })).toBeVisible();
  });
});

test.describe('Le formulaire', () => {
  test('refuse une saisie incomplète, champ par champ', async ({ page }) => {
    await simulerApi(page);
    await ouvrirLeFormulaire(page);

    await page.getByRole('button', { name: 'Ajouter au fonds' }).click();

    await expect(page.getByText('Le titre est obligatoire.')).toBeVisible();
    await expect(page.getByText("L'annee de publication est obligatoire.")).toBeVisible();
  });

  test("replace une erreur 422 de l'API sur le bon champ", async ({ page }) => {
    await simulerApi(page);
    await page.route('**/books', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();

      await route.fulfill({
        status: 422,
        json: {
          erreur: 'validation',
          message: 'Saisie refusee par le serveur.',
          champs: { editeur: "Cet editeur n'est pas reference." },
        },
      });
    });

    await ouvrirLeFormulaire(page);
    await page.getByLabel('Titre', { exact: true }).fill('Dune');
    await page.getByLabel('Auteur', { exact: true }).fill('Frank Herbert');
    await page.getByLabel('Editeur', { exact: true }).fill('Inconnu');
    await page.getByLabel('Annee de publication', { exact: true }).fill('1965');
    await page.getByRole('button', { name: 'Ajouter au fonds' }).click();

    await expect(page.getByText("Cet editeur n'est pas reference.")).toBeVisible();
  });
});

test.describe('La suppression', () => {
  test('laisse cinq secondes pour se raviser', async ({ page }) => {
    let suppressionsEnvoyees = 0;

    await simulerApi(page);
    await page.route('**/books/l-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        suppressionsEnvoyees += 1;
        return route.fulfill({ status: 204, body: '' });
      }

      return route.fulfill({ json: ouvrage(1) });
    });

    // On passe par la liste plutôt que par une URL directe : la route dynamique
    // n'existe pas comme fichier dans l'export statique.
    await ouvrirLeFonds(page);
    await page.getByText('Ouvrage 1', { exact: true }).click();

    await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(page.getByText('Supprimer cet ouvrage ?')).toBeVisible();
    await page.getByRole('button', { name: 'Supprimer definitivement' }).click();

    const annuler = page.getByRole('button', { name: 'Annuler', exact: true });
    await expect(annuler).toBeVisible();
    await annuler.click();
    await expect(annuler).toBeHidden();

    // Annulée avant le départ : rien n'est jamais parti au serveur.
    await page.waitForTimeout(6000);
    expect(suppressionsEnvoyees).toBe(0);
  });
});
