import { QueryClient } from "@tanstack/react-query";

import type { ApiError } from "@/domain";

/**
 * Declare ApiError comme type d'erreur par defaut de TanStack Query. Les hooks
 * exposent alors un `error` sur lequel l'interface peut discriminer `kind`,
 * sans avoir a le retyper a chaque appel.
 */
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

/**
 * Fabrique plutot que singleton : chaque test obtient un cache neuf, et
 * l'application n'en cree qu'un seul, monte dans le layout racine.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Le reessai vit dans le client HTTP, seul endroit qui sache quels
        // statuts se rejouent. L'activer ici aussi multiplierait les
        // tentatives et aggraverait une panne au lieu de l'absorber.
        retry: false,
        // Sans delai de peremption, chaque montage d'ecran refait une requete.
        // A 1,5 s de latence en mode degrade, ca se voit immediatement.
        staleTime: 30_000,
        // Une erreur de donnees doit produire l'ecran d'erreur avec reessai
        // exige au lot 1, pas remonter a l'ErrorBoundary global, reserve a
        // l'inattendu.
        throwOnError: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
