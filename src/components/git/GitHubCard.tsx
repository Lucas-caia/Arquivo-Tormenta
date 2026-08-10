import { Download, GitCommit, Github, RefreshCw, Send } from "lucide-react";
import type { GitStatus } from "../../../shared/types";
import { formatDate } from "../../utils/format";

export function GitHubCard({
  status,
  busy,
  onRefresh,
  onPull,
  onPush,
  expanded = false
}: {
  status: GitStatus | null;
  busy: boolean;
  onRefresh: () => void;
  onPull: () => void;
  onPush: () => void;
  expanded?: boolean;
}) {
  return (
    <section className={`side-card git-card ${expanded ? "expanded" : ""}`}>
      <header>
        <span><Github size={17} aria-hidden="true" /> Sincronização GitHub</span>
        <button className="icon-button" onClick={onRefresh} disabled={busy} aria-label="Atualizar status do Git">
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </header>
      <div className="git-info">
        <div><span>Status</span><strong className={status?.conectado ? "ok" : "warn"}>{status?.conectado ? "Repositório conectado" : "Git indisponível"}</strong></div>
        <div><span>Branch</span><strong>{status?.branch || "—"}</strong></div>
        <div><span>Alterações locais</span><strong>{status?.alterados.length ?? 0}</strong></div>
        <div><span>Verificado</span><strong>{status?.atualizadoEm ? formatDate(status.atualizadoEm) : "—"}</strong></div>
      </div>
      {expanded && status?.alterados.length ? (
        <div className="changed-files">
          <h3>Arquivos alterados</h3>
          <ul>{status.alterados.map((file) => <li key={file}><code>{file}</code></li>)}</ul>
        </div>
      ) : null}
      <div className="git-actions">
        <button className="button" disabled={busy || !status?.conectado} onClick={onPull}><Download size={14} aria-hidden="true" /> Puxar</button>
        <button className="button primary" disabled={busy || !status?.conectado} onClick={onPush}><Send size={14} aria-hidden="true" /> Enviar</button>
      </div>
      <p className="info-line"><GitCommit size={14} aria-hidden="true" /> Somente <code>data/fichas</code> e <code>data/revisoes</code> são preparados para commit.</p>
    </section>
  );
}
