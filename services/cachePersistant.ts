import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";

import { enrichmentKeys } from "@/services/queryKeys";

import { storage } from "./storage";

/** A week: long enough for a workstation left off over a holiday. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const CACHE_KEY = "booklist.cache";

/**
 * The persisted cache behind the whole application.
 *
 * Everything the bookseller has already seen survives a reload and a night
 * without network: on start-up the screen shows what it knew, then revalidates
 * in the background. The persister writes through the same storage contract as
 * the settings, so nothing here knows the platform either.
 *
 * `buster` ties the cache to the application version: a release that changes
 * a schema must not read yesterday's shapes.
 */
export function creerPersister() {
  return createAsyncStoragePersister({
    storage: {
      getItem: (key) => storage.read(key),
      setItem: (key, value) => storage.write(key, value),
      removeItem: (key) => storage.remove(key),
    },
    key: CACHE_KEY,
    // Short: a reload right after a change must find that change on disk.
    throttleTime: 300,
  });
}

export function optionsPersistance(): Omit<PersistQueryClientOptions, "queryClient"> {
  return {
    persister: creerPersister(),
    maxAge: CACHE_MAX_AGE_MS,
    buster: Constants.expoConfig?.version ?? "dev",
    dehydrateOptions: {
      // Open Library answers are a convenience, not the bookseller's data; a
      // failed query holds nothing worth keeping.
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && query.queryKey[0] !== enrichmentKeys.all[0],
    },
  };
}
