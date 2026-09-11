import {
  brancherNavigateur,
  estEnLigne,
  reinitialiserPourTests,
  signalerPanne,
  signalerSucces,
  surChangement,
} from "@/services/reseau/etat";

afterEach(reinitialiserPourTests);

describe("etat reseau", () => {
  it("est en ligne au depart", () => {
    expect(estEnLigne()).toBe(true);
  });

  it("bascule hors ligne sur une panne et revient au premier succes", () => {
    const vu: boolean[] = [];
    surChangement((v) => vu.push(v));

    signalerPanne();
    signalerPanne();
    signalerSucces();

    expect(vu).toEqual([false, true]);
    expect(estEnLigne()).toBe(true);
  });

  it("suit les evenements du navigateur", () => {
    const ecouteurs = new Map<string, () => void>();
    const cible = {
      onLine: false,
      addEventListener: (nom: string, f: () => void) => {
        ecouteurs.set(nom, f);
      },
      removeEventListener: (nom: string) => {
        ecouteurs.delete(nom);
      },
    };

    const arreter = brancherNavigateur(cible);
    expect(estEnLigne()).toBe(false);

    ecouteurs.get("online")?.();
    expect(estEnLigne()).toBe(true);

    arreter();
    expect(ecouteurs.size).toBe(0);
  });
});
