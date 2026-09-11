import { useQuery } from "@tanstack/react-query";

import { lireStats } from "@/services/api/stats";
import { statsKeys } from "@/services/queryKeys";

/** The network manager's figures; served from the persisted cache offline. */
export function useStats() {
  return useQuery({ queryKey: statsKeys.all, queryFn: ({ signal }) => lireStats(signal) });
}
