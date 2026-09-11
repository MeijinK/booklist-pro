export type AbonneReseau = (enLigne: boolean) => void;

/** The subset of `window`/`navigator` the browser wiring needs; injectable. */
export type CibleNavigateur = {
  onLine: boolean;
  addEventListener: (nom: "online" | "offline", ecouteur: () => void) => void;
  removeEventListener: (nom: "online" | "offline", ecouteur: () => void) => void;
};

/**
 * Whether the shop is reachable, as far as the application can tell.
 *
 * Two sources feed one boolean: the browser's own signal (`online`/`offline`
 * events), and the outcome of our requests — a fetch that never reached the
 * server flips us offline, the next answer of any status flips us back. A 503
 * is not "offline": the server answered, it is merely struggling.
 *
 * Native has no dependency-free signal here and starts online; the request
 * outcome corrects it within one call.
 */
let enLigne = true;
const abonnes = new Set<AbonneReseau>();

function publier(valeur: boolean): void {
  if (enLigne === valeur) return;
  enLigne = valeur;
  abonnes.forEach((abonne) => abonne(valeur));
}

export function estEnLigne(): boolean {
  return enLigne;
}

export function signalerPanne(): void {
  publier(false);
}

export function signalerSucces(): void {
  publier(true);
}

export function surChangement(abonne: AbonneReseau): () => void {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

export function brancherNavigateur(cible: CibleNavigateur): () => void {
  const surEnLigne = () => publier(true);
  const surHorsLigne = () => publier(false);

  publier(cible.onLine);
  cible.addEventListener("online", surEnLigne);
  cible.addEventListener("offline", surHorsLigne);

  return () => {
    cible.removeEventListener("online", surEnLigne);
    cible.removeEventListener("offline", surHorsLigne);
  };
}

/** Tests only. */
export function reinitialiserPourTests(): void {
  enLigne = true;
  abonnes.clear();
}
