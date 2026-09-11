import { TableauDeBord } from "@/features/stats/TableauDeBord";

/** Visible to every role: reading figures is not writing. */
export default function StatsScreen() {
  return <TableauDeBord />;
}
