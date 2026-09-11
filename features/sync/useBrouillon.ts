import { useCallback, useEffect, useState } from "react";

import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { storage } from "@/services/storage";

const DELAI_MS = 300;

export const BROUILLON_PREFIX = "booklist.brouillon.";

/**
 * What the bookseller is typing, written to disk as they type. A page reload
 * — or the till's browser crashing — in the middle of a note finds the text
 * where it was. `valeur` is undefined until the disk has been read, so a form
 * can tell "nothing saved" from "not read yet".
 */
export function useBrouillon(cle: string) {
  const cleStockage = `${BROUILLON_PREFIX}${cle}`;
  const [valeur, setValeur] = useState<string | undefined>(undefined);

  useEffect(() => {
    let actif = true;
    void storage.read(cleStockage).then((lu) => {
      if (actif) setValeur(lu ?? "");
    });
    return () => {
      actif = false;
    };
  }, [cleStockage]);

  const persister = useDebouncedCallback((texte: string) => {
    void (texte === "" ? storage.remove(cleStockage) : storage.write(cleStockage, texte));
  }, DELAI_MS);

  const ecrire = useCallback((texte: string) => persister.run(texte), [persister]);

  const effacer = useCallback(() => {
    persister.cancel();
    setValeur("");
    return storage.remove(cleStockage);
  }, [persister, cleStockage]);

  return { valeur, ecrire, effacer };
}
