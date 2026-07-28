import { CheckCircle, GitPullRequest, Upload } from "lucide-react";
import type { FichaResumo } from "../../shared/types";
import { EmptyState } from "../components/common/EmptyState";
import { FichaTable } from "../components/fichas/FichaTable";
import { routeHref } from "../routing/routes";

export function RevisoesPage({
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
  const updates = fichas.filter((ficha) => ficha.temRevisao);
  const newSheets = fichas.filter((ficha) => ficha.status === "em-revisao" && !ficha.temRevisao);

  if (!updates.length && !newSheets.length) {
    return (
      <section className="wide-card">
        <EmptyState
          icon={GitPullRequest}
          title="Nenhuma pendência"
          description="Não existem fichas novas aguardando aprovação nem atualizações para comparar."
          action={<a className="button primary" href={routeHref("upload")}><Upload size={15} aria-hidden="true" /> Enviar uma ficha</a>}
        />
      </section>
    );
  }

  return (
    <div className="stacked-sections">
      {updates.length ? (
        <FichaTable
          fichas={updates}
          query={query}
          title="Atualizações aguardando comparação"
          showStatusFilters={false}
          onView={onView}
          onCompare={onCompare}
          onApprove={onApprove}
        />
      ) : null}

      {newSheets.length ? (
        <section>
          <div className="section-intro">
            <div>
              <h2>Fichas novas aguardando aprovação</h2>
              <p>Estas fichas ainda não possuem uma versão anterior. A ação de aprovação apenas confirma o JSON importado.</p>
            </div>
            <CheckCircle size={22} aria-hidden="true" />
          </div>
          <FichaTable
            fichas={newSheets}
            query={query}
            title="Novas fichas"
            showStatusFilters={false}
            onView={onView}
            onCompare={onCompare}
            onApprove={onApprove}
          />
        </section>
      ) : null}
    </div>
  );
}
