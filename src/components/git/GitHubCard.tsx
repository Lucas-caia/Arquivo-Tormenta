import { Download, Github, RefreshCw, Settings2 } from "lucide-react";
import type { GitStatus } from "../../../shared/types";
import { formatDate } from "../../utils/format";

export function GitHubCard({
  status,
  busy,
  onRefresh,
  onPull,
  onOpenSettings,
  expanded = false
}: {
  status: GitStatus | null;
  busy: boolean;
  onRefresh: () => void;
  onPull: () => void;
  onOpenSettings: () => void;
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
        <div><span>Status</span><strong className={status?.conectado ? "ok" : "warn"}>{status?.conectado ? "Conexão verificada" : "Configuração pendente"}</strong></div>
        <div><span>Branch</span><strong>{status?.branch || "—"}</strong></div>
        <div><span>Deploy Key</span><strong>{status?.chaveConfigurada ? "Detectada" : "Ausente"}</strong></div>
        <div><span>Verificado</span><strong>{status?.verificadoEm ? formatDate(status.verificadoEm) : "—"}</strong></div>
      </div>
      <div className="git-actions">
        <button className="button" disabled={busy || !status?.conectado} onClick={onPull}><Download size={14} aria-hidden="true" /> Pull</button>
        <button className="button primary" disabled={busy} onClick={onOpenSettings}><Settings2 size={14} aria-hidden="true" /> Gerenciar</button>
      </div>
      <p className="info-line">Push, branch, escopo e mensagens de commit são configurados na área GitHub.</p>
    </section>
  );
}
