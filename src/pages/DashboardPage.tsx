import { ArrowRight, CheckCircle, Download, GitPullRequest, Upload } from "lucide-react";
import type { Estatisticas, FichaResumo, GitStatus } from "../../shared/types";
import { SummaryCards } from "../components/common/SummaryCards";
import { FichaTable } from "../components/fichas/FichaTable";
import { GitHubCard } from "../components/git/GitHubCard";
import { routeHref } from "../routing/routes";

export type DashboardPageProps = {
  fichas: FichaResumo[];
  stats: Estatisticas;
  git: GitStatus | null;
  gitBusy: boolean;
  actionBusy: boolean;
  query: string;
  onView: (id: string) => void;
  onCompare: (id: string) => void;
  onApprove: (id: string) => void;
  onApproveAll: () => void;
  onRefreshGit: () => void;
  onPull: () => void;
  onOpenGitHub: () => void;
};

export function DashboardPage(props: DashboardPageProps) {
  return (
    <>
      <SummaryCards stats={props.stats} />
      <div className="content-grid">
        <div className="left-column">
          <FichaTable
            fichas={props.fichas}
            query={props.query}
            title="Fichas recentes"
            compact
            onView={props.onView}
            onCompare={props.onCompare}
            onApprove={props.onApprove}
          />
        </div>
        <div className="right-column">
          <GitHubCard
            status={props.git}
            busy={props.gitBusy}
            onRefresh={props.onRefreshGit}
            onPull={props.onPull}
            onOpenSettings={props.onOpenGitHub}
          />
          <section className="side-card">
            <header><span><ArrowRight size={16} aria-hidden="true" /> Ações rápidas</span></header>
            <div className="quick-list">
              <a className="success" href={routeHref("revisoes")}><GitPullRequest size={14} aria-hidden="true" /> Abrir revisões pendentes</a>
              <a href={routeHref("upload")}><Upload size={14} aria-hidden="true" /> Importar nova ficha</a>
              <a href="/api/export"><Download size={14} aria-hidden="true" /> Exportar todas em JSON</a>
              <button disabled={props.actionBusy || props.stats.emRevisao === 0} onClick={props.onApproveAll}>
                <CheckCircle size={14} aria-hidden="true" /> Aprovar fichas novas
              </button>
            </div>
            <p className="card-note">A aprovação em massa não aplica atualizações pendentes; revisões com diferenças continuam exigindo comparação individual.</p>
          </section>
        </div>
      </div>
    </>
  );
}
