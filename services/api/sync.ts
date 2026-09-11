import { ReponseSyncSchema, type MutationLivre, type ReponseSync } from "@/domain";

import { request } from "./client";

/** The queue's shape is ours; this is the server's. Translated here and nowhere else. */
function versFil(m: MutationLivre) {
  switch (m.type) {
    case "create":
      return { id: m.id, type: "create", livre: m.livre };
    case "update":
      return {
        id: m.id,
        type: "update",
        baseVersion: m.baseVersion,
        livre: { id: m.livreId, ...m.champs },
      };
    case "delete":
      return { id: m.id, type: "delete", baseVersion: m.baseVersion, livreId: m.livreId };
  }
}

/**
 * POST /sync. Goes through `request`, hence through the interceptor: a token
 * expiring mid-batch is refreshed and the same body — same ids — is replayed,
 * which the server answers with `rejeu: true` for what it already applied.
 */
export function envoyerLot(lot: readonly MutationLivre[]): Promise<ReponseSync> {
  return request("/sync", {
    method: "POST",
    body: { mutations: lot.map(versFil) },
    schema: ReponseSyncSchema,
  });
}
