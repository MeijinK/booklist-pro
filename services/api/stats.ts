import { StatsSchema, type Stats } from "@/domain";

import { request } from "./client";

/** GET /stats — the network manager's figures, validated like every answer. */
export function lireStats(signal?: AbortSignal): Promise<Stats> {
  return request("/stats", { schema: StatsSchema, signal });
}
