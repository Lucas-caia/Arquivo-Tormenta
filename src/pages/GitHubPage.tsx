import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileJson2,
  GitBranch,
  GitCommit,
  Github,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  X
} from "lucide-react";
import type { GitPreview, GitSettings, GitStatus } from "../../shared/types";
import { formatDate } from "../utils/format";

export function GitHubPage({
  status,
  settings,
  branches,
  preview,
  busy,
  onRefresh,
  onSave,
  onVerify,
  onPull,
  onPreparePush,
  onConfirmPush,
  onCancelPush
}: {
  status: GitStatus | null;
  settings: GitSettings | null;
  branches: string[];
  preview: GitPreview | null;
  busy: boolean;
  onRefresh: () => void;
  onSave: (settings: GitSettings) => Promise<void>;
  onVerify: () => void;
  onPull: () => void;
  onPreparePush: () => void;
  onConfirmPush: () => void;
  onCancelPush: () => void;
}) {
  const [draft, setDraft] = useState<GitSettings | null>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!draft) {
    return (
      <section className="wide-card empty-state">
        <Github size={34} aria-hidden="true" />
        <h3>Configuração Git indisponível</h3>
        <p>Não foi possível carregar as preferências de sincronização.</p>
        <button className="button" onClick={onRefresh}>Tentar novamente</button>
      </section>
    );
  }

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const canSync = Boolean(status?.conectado && !isDirty);

  function update<K extends keyof GitSettings>(key: K, value: GitSettings[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  function updateScope(scope: "fichas" | "revisoes", checked: boolean) {
    setDraft((current) => current ? {
      ...current,
      escopos: { ...current.escopos, [scope]: checked }
    } : current);
  }

  function updateTemplate(key: keyof GitSettings["templates"], value: string) {
    setDraft((current) => current ? {
      ...current,
      templates: { ...current.templates, [key]: value }
    } : current);
  }

  function updateAuthor(key: keyof GitSettings["autor"], value: string) {
    setDraft((current) => current ? {
      ...current,
      autor: { ...current.autor, [key]: value }
    } : current);
  }

  return (
    <div className="git-settings-layout">
      <div className="stacked-sections">
        <section className="wide-card git-configuration-card">
          <header>
            <span><Settings2 size={17} aria-hidden="true" /> Configuração do repositório</span>
            <button className="icon-button" onClick={onRefresh} disabled={busy} aria-label="Atualizar status do Git">
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </header>

          <div className="git-config-form">
            <label className="git-field git-field-wide">
              <span>Repositório SSH</span>
              <input
                value={draft.remoteUrl}
                onChange={(event) => update("remoteUrl", event.target.value)}
                placeholder="git@github.com:usuario/repositorio.git"
                spellCheck={false}
                autoComplete="off"
              />
              <small>A URL não contém senha nem token e pode ser salva normalmente.</small>
            </label>

            <label className="git-field">
              <span>Branch de sincronização</span>
              <input
                value={draft.branch}
                onChange={(event) => update("branch", event.target.value)}
                list="git-branches-list"
                spellCheck={false}
                autoComplete="off"
              />
              <datalist id="git-branches-list">
                {branches.map((branch) => <option key={branch} value={branch} />)}
              </datalist>
            </label>

            <div className="git-field">
              <span>Dados incluídos</span>
              <div className="git-scope-options">
                <label>
                  <input
                    type="checkbox"
                    checked={draft.escopos.fichas}
                    onChange={(event) => updateScope("fichas", event.target.checked)}
                  />
                  <span><FileJson2 size={15} aria-hidden="true" /> Fichas</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.escopos.revisoes}
                    onChange={(event) => updateScope("revisoes", event.target.checked)}
                  />
                  <span><GitCommit size={15} aria-hidden="true" /> Revisões</span>
                </label>
              </div>
            </div>

            <label className="git-field">
              <span>Estilo dos commits</span>
              <select
                value={draft.estiloCommit}
                onChange={(event) => update("estiloCommit", event.target.value as GitSettings["estiloCommit"])}
              >
                <option value="descritivo">Descritivo</option>
                <option value="conventional">Conventional Commits</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>

            <label className="git-field">
              <span>Autor dos commits</span>
              <input
                value={draft.autor.nome}
                onChange={(event) => updateAuthor("nome", event.target.value)}
                placeholder="Arquivo Tormenta"
              />
            </label>

            <label className="git-field">
              <span>E-mail do autor</span>
              <input
                type="email"
                value={draft.autor.email}
                onChange={(event) => updateAuthor("email", event.target.value)}
                placeholder="arquivo-tormenta@local"
              />
              <small>É apenas metadado do commit; não autentica no GitHub.</small>
            </label>
          </div>

          <div className="commit-examples">
            <div>
              <span>Nova ficha</span>
              <code>{draft.estiloCommit === "conventional" ? "feat(fichas): adiciona Blek" : draft.estiloCommit === "personalizado" ? draft.templates.novaFicha : "ficha: adiciona Blek"}</code>
            </div>
            <div>
              <span>Ficha atualizada</span>
              <code>{draft.estiloCommit === "conventional" ? "chore(fichas): atualiza Blek para v5" : draft.estiloCommit === "personalizado" ? draft.templates.fichaAtualizada : "ficha: atualiza Blek para v5"}</code>
            </div>
          </div>

          {draft.estiloCommit === "personalizado" && (
            <div className="git-template-grid">
              <label className="git-field">
                <span>Nova ficha</span>
                <input value={draft.templates.novaFicha} onChange={(event) => updateTemplate("novaFicha", event.target.value)} />
                <small>Variáveis: <code>{"{nome}"}</code>, <code>{"{versao}"}</code>, <code>{"{quantidade}"}</code>.</small>
              </label>
              <label className="git-field">
                <span>Ficha atualizada</span>
                <input value={draft.templates.fichaAtualizada} onChange={(event) => updateTemplate("fichaAtualizada", event.target.value)} />
              </label>
              <label className="git-field git-field-wide">
                <span>Múltiplas alterações</span>
                <input value={draft.templates.multiplasAlteracoes} onChange={(event) => updateTemplate("multiplasAlteracoes", event.target.value)} />
              </label>
            </div>
          )}

          <div className="git-config-actions">
            <button className="button primary" disabled={busy || !isDirty} onClick={() => void onSave(draft)}>
              <Save size={14} aria-hidden="true" /> Salvar configurações
            </button>
            <button className="button" disabled={busy || isDirty || !draft.remoteUrl} onClick={onVerify}>
              <ShieldCheck size={14} aria-hidden="true" /> Verificar conexão
            </button>
          </div>
          {isDirty && <p className="git-unsaved-note">Salve as alterações antes de verificar a conexão ou sincronizar.</p>}
        </section>

        <section className="wide-card git-sync-card">
          <header><span><Github size={17} aria-hidden="true" /> Sincronização</span></header>
          <div className="git-sync-actions">
            <button className="button" disabled={busy || !canSync} onClick={onPull}>
              <Download size={14} aria-hidden="true" /> Pull seguro
            </button>
            <button className="button primary" disabled={busy || !canSync} onClick={onPreparePush}>
              <Send size={14} aria-hidden="true" /> Preparar Push
            </button>
          </div>
          <p className="info-line">
            <LockKeyhole size={14} aria-hidden="true" />
            O Pull preserva alterações locais quando não existe conflito no mesmo arquivo. O Push exige uma prévia antes da confirmação.
          </p>
        </section>

        {preview && (
          <section className="wide-card git-preview-card">
            <header>
              <span><GitCommit size={17} aria-hidden="true" /> Prévia do Push</span>
              <button className="icon-button" onClick={onCancelPush} disabled={busy} aria-label="Fechar prévia">
                <X size={15} aria-hidden="true" />
              </button>
            </header>
            <div className="git-preview-summary">
              <div><span>Branch</span><strong>{preview.branch}</strong></div>
              <div><span>Arquivos</span><strong>{preview.total}</strong></div>
              <div><span>Novas fichas</span><strong>{preview.novasFichas}</strong></div>
              <div><span>Atualizadas</span><strong>{preview.fichasAtualizadas}</strong></div>
            </div>
            <div className="git-preview-commit">
              <span>Commit</span>
              <code>{preview.mensagemCommit}</code>
            </div>
            {preview.arquivos.length > 0 && (
              <div className="changed-files">
                <h3>Arquivos preparados</h3>
                <ul>
                  {preview.arquivos.map((file) => (
                    <li key={`${file.status}-${file.caminho}`}><strong>{file.status}</strong> <code>{file.caminho}</code></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="git-config-actions">
              <button className="button" onClick={onCancelPush} disabled={busy}>Cancelar</button>
              <button className="button primary" onClick={onConfirmPush} disabled={busy || preview.total === 0}>
                <Send size={14} aria-hidden="true" /> Confirmar Push
              </button>
            </div>
          </section>
        )}
      </div>

      <aside className="stacked-sections">
        <section className="side-card git-status-card">
          <header><span><CheckCircle2 size={17} aria-hidden="true" /> Estado</span></header>
          <div className="git-info">
            <div><span>Git</span><strong className={status?.gitDisponivel ? "ok" : "warn"}>{status?.gitDisponivel ? "Disponível" : "Indisponível"}</strong></div>
            <div><span>Deploy Key</span><strong className={status?.chaveConfigurada ? "ok" : "warn"}>{status?.chaveConfigurada ? "Detectada" : "Não configurada"}</strong></div>
            <div><span>Conexão</span><strong className={status?.conectado ? "ok" : "warn"}>{status?.conectado ? "Verificada" : "Pendente"}</strong></div>
            <div><span>Branch</span><strong>{status?.branch || "—"}</strong></div>
            <div><span>Última verificação</span><strong>{status?.verificadoEm ? formatDate(status.verificadoEm) : "—"}</strong></div>
          </div>
          <p className="card-note">{status?.mensagem ?? "Consultando configuração Git..."}</p>
        </section>

        <section className="side-card policy-card">
          <header><span><KeyRound size={17} aria-hidden="true" /> Autenticação segura</span></header>
          <p>A interface nunca recebe senha, token ou chave privada. A aplicação procura somente a Deploy Key local em <code>.secrets/github_deploy_key</code>.</p>
          <p>O Docker recebe essa pasta em modo somente leitura e a imagem não contém a credencial.</p>
        </section>

        <section className="side-card policy-card">
          <header><span><GitBranch size={17} aria-hidden="true" /> Repositório isolado</span></header>
          <p>A sincronização usa um repositório próprio em <code>runtime/git-sync</code>. O Git da aplicação não altera o <code>.git</code> usado no desenvolvimento do projeto.</p>
        </section>
      </aside>
    </div>
  );
}
