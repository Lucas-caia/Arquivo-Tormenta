import { useMemo, useState } from "react";
import { CheckCircle, Eye, GitCompare, Search } from "lucide-react";
import type { FichaResumo, StatusFicha } from "../../../shared/types";
import { formatDate } from "../../utils/format";
import { StatusBadge } from "../common/StatusBadge";
import { ClassIcon } from "./ClassIcon";

export type FichaTableProps = {
  fichas: FichaResumo[];
  query?: string;
  title?: string;
  initialStatus?: "todas" | StatusFicha;
  compact?: boolean;
  showStatusFilters?: boolean;
  onView: (id: string) => void;
  onCompare: (id: string) => void;
  onApprove: (id: string) => void;
};

export function FichaTable({
  fichas,
  query = "",
  title = "Fichas de personagens",
  initialStatus = "todas",
  compact = false,
  showStatusFilters = true,
  onView,
  onCompare,
  onApprove
}: FichaTableProps) {
  const [statusFilter, setStatusFilter] = useState<"todas" | StatusFicha>(initialStatus);
  const [localSearch, setLocalSearch] = useState("");

  const filtered = useMemo(() => {
    const text = `${query} ${localSearch}`.trim().toLocaleLowerCase("pt-BR");
    return fichas.filter((ficha) => {
      const statusMatches = statusFilter === "todas" || ficha.status === statusFilter;
      const searchable = [
        ficha.nome,
        ficha.jogador,
        ficha.raca,
        ficha.origem,
        ficha.classe,
        ficha.nivel,
        ficha.status
      ].join(" ").toLocaleLowerCase("pt-BR");
      return statusMatches && (!text || searchable.includes(text));
    });
  }, [fichas, localSearch, query, statusFilter]);

  const visible = compact ? filtered.slice(0, 8) : filtered;

  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div className="table-title">
          <h2>{title}</h2>
          <span>{filtered.length}</span>
        </div>
        <div className="filters">
          {showStatusFilters && (
            <div className="segmented-control" aria-label="Filtrar por status">
              <button className={statusFilter === "todas" ? "selected" : ""} onClick={() => setStatusFilter("todas")}>Todas</button>
              <button className={statusFilter === "aprovado" ? "selected" : ""} onClick={() => setStatusFilter("aprovado")}>Aprovadas</button>
              <button className={statusFilter === "em-revisao" ? "selected" : ""} onClick={() => setStatusFilter("em-revisao")}>Em revisão</button>
            </div>
          )}
          {!compact && (
            <label className="mini-search">
              <Search size={14} aria-hidden="true" />
              <span className="sr-only">Filtrar esta tabela</span>
              <input value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Filtrar tabela..." />
            </label>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Personagem</th>
              <th>Jogador</th>
              <th>Raça</th>
              <th>Classe</th>
              <th>Nível</th>
              <th>Status</th>
              <th>Atualização</th>
              <th><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((ficha) => (
              <tr key={ficha.id}>
                <td>
                  <div className="character-cell">
                    <span><ClassIcon classe={ficha.classe} /></span>
                    <strong>{ficha.nome}</strong>
                  </div>
                </td>
                <td>{ficha.jogador || "—"}</td>
                <td>{ficha.raca || "—"}</td>
                <td><span className="class-pill">{ficha.classe || "—"}</span></td>
                <td><strong className="level">{ficha.nivel || "—"}</strong></td>
                <td><StatusBadge status={ficha.status} /></td>
                <td>{formatDate(ficha.atualizadoEm)}</td>
                <td>
                  <div className="row-actions">
                    <button aria-label={`Ver ficha de ${ficha.nome}`} title="Ver ficha" onClick={() => onView(ficha.id)}>
                      <Eye size={15} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Comparar revisão de ${ficha.nome}`}
                      title="Comparar revisão"
                      disabled={!ficha.temRevisao}
                      onClick={() => onCompare(ficha.id)}
                    >
                      <GitCompare size={15} aria-hidden="true" />
                    </button>
                    <button
                      aria-label={`Aprovar ficha de ${ficha.nome}`}
                      title="Aprovar ficha"
                      disabled={ficha.status === "aprovado" || ficha.temRevisao}
                      onClick={() => onApprove(ficha.id)}
                    >
                      <CheckCircle size={15} aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr><td colSpan={8} className="empty-row">Nenhuma ficha encontrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
