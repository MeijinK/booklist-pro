import {
  cancel,
  flush,
  isPending,
  pendingKeys,
  schedule,
  UNDO_DELAY_MS,
} from "@/services/mutations";

describe("ecritures a depart differe", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    // L'etat vit au niveau du module : sans ce nettoyage, une operation en
    // attente fuiterait d'un test sur l'autre.
    for (const key of pendingKeys()) cancel(key);
    jest.useRealTimers();
  });

  it("n'envoie rien avant la fin du delai", () => {
    const run = jest.fn().mockResolvedValue(undefined);
    schedule({ key: "livre-1", run });

    jest.advanceTimersByTime(UNDO_DELAY_MS - 1);

    expect(run).not.toHaveBeenCalled();
    expect(isPending("livre-1")).toBe(true);
  });

  it("envoie a la fin du delai", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    schedule({ key: "livre-1", run });

    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(run).toHaveBeenCalledTimes(1);
    expect(isPending("livre-1")).toBe(false);
  });

  it("annuler avant l'echeance empeche l'envoi", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    schedule({ key: "livre-1", run });

    expect(cancel("livre-1")).toBe(true);
    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(run).not.toHaveBeenCalled();
  });

  it("annuler apres le depart rend false : le libraire n'a pas rattrape a temps", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    schedule({ key: "livre-1", run });

    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(cancel("livre-1")).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("reprogrammer la meme cle remplace l'attente au lieu d'en empiler une seconde", async () => {
    const premier = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);

    schedule({ key: "livre-1", run: premier });
    schedule({ key: "livre-1", run: second });

    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(premier).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("des cles differentes n'interferent pas", async () => {
    const premier = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);

    schedule({ key: "livre-1", run: premier });
    schedule({ key: "livre-2", run: second });
    cancel("livre-1");

    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(premier).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("transmet l'erreur a onSettled quand l'appel echoue", async () => {
    const panne = new Error("503");
    const onSettled = jest.fn();
    schedule({ key: "livre-1", run: () => Promise.reject(panne), onSettled });

    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(onSettled).toHaveBeenCalledWith(panne);
  });

  it("appelle onSettled sans erreur quand l'appel reussit", async () => {
    const onSettled = jest.fn();
    schedule({ key: "livre-1", run: () => Promise.resolve(), onSettled });

    await jest.advanceTimersByTimeAsync(UNDO_DELAY_MS);

    expect(onSettled).toHaveBeenCalledWith();
  });

  it("flush envoie sans attendre la fin du delai", async () => {
    const run = jest.fn().mockResolvedValue(undefined);
    schedule({ key: "livre-1", run });

    await flush("livre-1");

    expect(run).toHaveBeenCalledTimes(1);
    expect(isPending("livre-1")).toBe(false);
  });
});
