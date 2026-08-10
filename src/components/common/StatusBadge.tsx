import type { StatusFicha } from "../../../shared/types";

export function StatusBadge({ status }: { status: StatusFicha }) {
  const approved = status === "aprovado";
  return (
    <span className={`status-badge ${approved ? "status-approved" : "status-review"}`}>
      <span aria-hidden="true" />
      {approved ? "Aprovado" : "Em revisão"}
    </span>
  );
}
