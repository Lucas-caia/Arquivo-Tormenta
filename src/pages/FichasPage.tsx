import type { FichaResumo } from "../../shared/types";
import { FichaTable } from "../components/fichas/FichaTable";

export function FichasPage({
  fichas,
  query,
  onView,
  onCompare,
  onApprove
}: {
  fichas: FichaResumo[];
  query: string;
  onView: (id: string) => void;
  onCompare: (id: string) => void;
  onApprove: (id: string) => void;
}) {
  return (
    <FichaTable
      fichas={fichas}
      query={query}
      onView={onView}
      onCompare={onCompare}
      onApprove={onApprove}
    />
  );
}
