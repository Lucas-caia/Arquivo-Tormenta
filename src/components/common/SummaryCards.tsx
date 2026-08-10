import { CheckCircle, Clock, FileJson, GitCompare, RefreshCw } from "lucide-react";
import type { Estatisticas } from "../../../shared/types";

export function SummaryCards({ stats }: { stats: Estatisticas }) {
  const cards = [
    { label: "Total de fichas", value: stats.total, text: "Personagens armazenados", icon: FileJson, theme: "gold" },
    { label: "Aprovadas", value: stats.aprovadas, text: "Fichas validadas", icon: CheckCircle, theme: "green" },
    { label: "Fichas novas", value: stats.emRevisao, text: "Aguardando aprovação", icon: Clock, theme: "amber" },
    { label: "Revisões pendentes", value: stats.revisoesPendentes, text: "Atualizações para comparar", icon: GitCompare, theme: "blue" },
    { label: "Última atualização", value: stats.ultimaAtualizacao, text: "Dados em /data/fichas", icon: RefreshCw, theme: "neutral" }
  ];

  return (
    <section className="summary-grid" aria-label="Resumo do acervo">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className={`summary-card ${card.theme}`} key={card.label}>
            <div><Icon aria-hidden="true" /></div>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <small>{card.text}</small>
          </article>
        );
      })}
    </section>
  );
}
