import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileJson,
  FileText,
  Filter,
  GitCommit,
  GitCompare,
  Github,
  GitPullRequest,
  LayoutDashboard,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Swords,
  Upload,
  X
} from "lucide-react";
import { aplicarRevisao, aprovarTodas, atualizarStatus, enviarPdf, gitPull, gitPush, gitStatus, listarFichas, obterFicha, obterRevisao } from "./api";
import type { Diferenca, Ficha, FichaResumo, GitStatus, Revisao, StatusFicha, Estatisticas } from "./types";

type NavItem = {
  id: string;
  label: string;
  icon: JSX.Element;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { id: "fichas", label: "Fichas", icon: <FileText size={16} /> },
  { id: "upload", label: "Enviar PDF", icon: <Upload size={16} /> },
  { id: "revisoes", label: "Revisões", icon: <GitPullRequest size={16} /> },
  { id: "github", label: "GitHub", icon: <Github size={16} /> },
  { id: "configuracoes", label: "Configurações", icon: <Settings size={16} /> }
];

const emptyStats: Estatisticas = {
  total: 0,
  aprovadas: 0,
  emRevisao: 0,
  ultimaAtualizacao: "Sem registros"
};

function D20Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="12,2 17,7 12,12 7,7" stroke="currentColor" strokeWidth="1" opacity="0.65" />
      <text x="12" y="17" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="700">20</text>
    </svg>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function valueText(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((item) => typeof item === "object" ? JSON.stringify(item) : String(item)).join("; ");
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function StatusBadge({ status }: { status: StatusFicha }) {
  return (
    <span className={`status-badge ${status === "aprovado" ? "status-approved" : "status-review"}`}>
      <span />
      {status === "aprovado" ? "Aprovado" : "Em revisão"}
    </span>
  );
}

function ClassIcon({ classe }: { classe: string }) {
  const normalized = classe.toLowerCase();
  if (normalized.includes("guerreiro") || normalized.includes("paladino")) return <Shield size={13} />;
  if (normalized.includes("ladino")) return <Swords size={13} />;
  return <Sparkles size={13} />;
}

function Sidebar({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon"><D20Icon /></div>
        <div>
          <strong>Arquivo</strong>
          <span>Tormenta</span>
        </div>
      </div>
      <nav className="nav">
        <p>Principal</p>
        {navItems.slice(0, 4).map((item) => (
          <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
            {item.icon}
            {item.label}
          </button>
        ))}
        <p>Sistema</p>
        {navItems.slice(4).map((item) => (
          <button key={item.id} className={active === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="profile-card">
        <span />
        <div>
          <strong>Mestre Ardivan</strong>
          <small>Administrador</small>
        </div>
      </div>
    </aside>
  );
}

function SummaryCards({ stats }: { stats: Estatisticas }) {
  const cards = [
    { label: "Total de Fichas", value: stats.total, text: "Personagens cadastrados", icon: <FileJson />, theme: "gold" },
    { label: "Aprovadas", value: stats.aprovadas, text: "Fichas validadas", icon: <CheckCircle />, theme: "green" },
    { label: "Em Revisão", value: stats.emRevisao, text: "Aguardando aprovação", icon: <Clock />, theme: "amber" },
    { label: "Última Atualização", value: stats.ultimaAtualizacao, text: "Dados em /data/fichas", icon: <RefreshCw />, theme: "neutral" }
  ];
  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article className={`summary-card ${card.theme}`} key={card.label}>
          <div>{card.icon}</div>
          <strong>{card.value}</strong>
          <span>{card.label}</span>
          <small>{card.text}</small>
        </article>
      ))}
    </section>
  );
}

function UploadPanel({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }
  return (
    <div
      className={`upload-panel ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="upload-icon"><FileText size={25} /></div>
      <strong>Arraste sua ficha em PDF aqui</strong>
      <span>O sistema irá extrair os dados, não salvará o PDF bruto e comparará pelo nome do personagem.</span>
      <button className="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload size={15} />
        {busy ? "Processando..." : "Selecionar PDF"}
      </button>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => handleFiles(event.target.files)} />
    </div>
  );
}

function SheetsTable({ fichas, query, onView, onCompare, onApprove }: { fichas: FichaResumo[]; query: string; onView: (id: string) => void; onCompare: (id: string) => void; onApprove: (id: string) => void }) {
  const [filter, setFilter] = useState<"todas" | StatusFicha>("todas");
  const [localSearch, setLocalSearch] = useState("");
  const filtered = useMemo(() => {
    const text = `${query} ${localSearch}`.trim().toLowerCase();
    return fichas.filter((ficha) => {
      const statusOk = filter === "todas" || ficha.status === filter;
      const searchOk = !text || [ficha.nome, ficha.jogador, ficha.raca, ficha.origem, ficha.classe, ficha.nivel, ficha.status].join(" ").toLowerCase().includes(text);
      return statusOk && searchOk;
    });
  }, [fichas, filter, query, localSearch]);
  return (
    <section className="table-card">
      <div className="table-toolbar">
        <div>
          <h2>Fichas de Personagens</h2>
          <span>{filtered.length}</span>
        </div>
        <div className="filters">
          <button className={filter === "todas" ? "selected" : ""} onClick={() => setFilter("todas")}>Todas</button>
          <button className={filter === "aprovado" ? "selected" : ""} onClick={() => setFilter("aprovado")}>Aprovadas</button>
          <button className={filter === "em-revisao" ? "selected" : ""} onClick={() => setFilter("em-revisao")}>Em revisão</button>
          <label className="mini-search">
            <Search size={14} />
            <input value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Filtrar..." />
          </label>
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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ficha) => (
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
                    <button title="Ver ficha" onClick={() => onView(ficha.id)}><Eye size={15} /></button>
                    <button title="Comparar revisão" disabled={!ficha.temRevisao} onClick={() => onCompare(ficha.id)}><GitCompare size={15} /></button>
                    <button title="Aprovar" disabled={ficha.status === "aprovado"} onClick={() => onApprove(ficha.id)}><CheckCircle size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="empty-row">Nenhuma ficha encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GitHubCard({ status, busy, onPull, onPush }: { status: GitStatus | null; busy: boolean; onPull: () => void; onPush: () => void }) {
  return (
    <section className="side-card">
      <header><Github size={16} /> Sincronização GitHub</header>
      <div className="git-info">
        <div><span>Status</span><strong className={status?.conectado ? "ok" : "warn"}>{status?.conectado ? "Repositório conectado" : "Git indisponível"}</strong></div>
        <div><span>Branch</span><strong>{status?.branch || "—"}</strong></div>
        <div><span>Alterações</span><strong>{status?.alterados.length ?? 0}</strong></div>
        <div><span>Verificado</span><strong>{status?.atualizadoEm ? formatDate(status.atualizadoEm) : "—"}</strong></div>
      </div>
      <div className="git-actions">
        <button disabled={busy} onClick={onPull}><Download size={14} /> Puxar</button>
        <button disabled={busy} className="primary" onClick={onPush}><Send size={14} /> Enviar</button>
      </div>
      <p className="info-line"><GitCommit size={14} /> As fichas ficam somente como JSON em <code>/data/fichas</code>.</p>
    </section>
  );
}

function QuickActions({ onApproveAll }: { onApproveAll: () => void }) {
  return (
    <section className="side-card">
      <header><ArrowRight size={16} /> Ações Rápidas</header>
      <div className="quick-list">
        <button className="success" onClick={onApproveAll}><CheckCircle size={14} /> Aprovar todas em revisão</button>
        <a href="/api/export"><Download size={14} /> Exportar fichas JSON</a>
        <button><GitCommit size={14} /> Ver histórico no Git</button>
        <button><Filter size={14} /> Filtrar por classe</button>
      </div>
    </section>
  );
}

function DiffValue({ value }: { value: unknown }) {
  const text = valueText(value);
  return <pre>{text}</pre>;
}

function ComparisonModal({ revisao, busy, onClose, onApply }: { revisao: Revisao; busy: boolean; onClose: () => void; onApply: (status: StatusFicha) => void }) {
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal diff-modal">
        <header>
          <div>
            <span><GitCompare size={16} /> Comparação de Alterações</span>
            <h2>{revisao.nome}</h2>
            <small>Foram encontradas {revisao.diferencas.length} alteração(ões) nesta ficha.</small>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </header>
        <div className="alert-box"><AlertTriangle size={17} /> A ficha ainda não foi atualizada. Confirme antes de sobrescrever o JSON salvo.</div>
        <div className="diff-table">
          <div className="diff-head">Campo</div>
          <div className="diff-head before">Antes</div>
          <div className="diff-head after">Depois</div>
          {revisao.diferencas.map((diff: Diferenca) => (
            <div className="diff-row" key={diff.caminho}>
              <strong>{diff.rotulo}</strong>
              <DiffValue value={diff.antes} />
              <DiffValue value={diff.depois} />
            </div>
          ))}
        </div>
        <footer>
          <button onClick={onClose}>Cancelar</button>
          <button disabled={busy} onClick={() => onApply("em-revisao")}>Atualizar e manter em revisão</button>
          <button disabled={busy} className="primary" onClick={() => onApply("aprovado")}><CheckCircle size={15} /> Aprovar e atualizar</button>
        </footer>
      </section>
    </div>
  );
}

function DetailModal({ ficha, onClose }: { ficha: Ficha; onClose: () => void }) {
  return (
    <div className="modal-layer">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal detail-modal">
        <header>
          <div>
            <span><FileJson size={16} /> Ficha JSON</span>
            <h2>{ficha.nome}</h2>
            <small>Versão {ficha.historico.versao} · {formatDate(ficha.historico.atualizadoEm)}</small>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </header>
        <div className="detail-grid">
          <article><span>Jogador</span><strong>{ficha.jogador || "—"}</strong></article>
          <article><span>Raça</span><strong>{ficha.raca || "—"}</strong></article>
          <article><span>Origem</span><strong>{ficha.origem || "—"}</strong></article>
          <article><span>Classe</span><strong>{ficha.classe} {ficha.nivel}</strong></article>
          <article><span>PV</span><strong>{ficha.recursos.vidaAtual || ficha.recursos.vidaMaxima || "—"}/{ficha.recursos.vidaMaxima || "—"}</strong></article>
          <article><span>PM</span><strong>{ficha.recursos.manaAtual || ficha.recursos.manaMaxima || "—"}/{ficha.recursos.manaMaxima || "—"}</strong></article>
          <article><span>Defesa</span><strong>{ficha.defesa.total || "—"}</strong></article>
          <article><span>Status</span><StatusBadge status={ficha.status} /></article>
        </div>
        <div className="json-columns">
          <section>
            <h3>Atributos</h3>
            {Object.entries(ficha.atributos).map(([key, item]) => <p key={key}><span>{key}</span><strong>{item || "—"}</strong></p>)}
          </section>
          <section>
            <h3>Ataques</h3>
            {ficha.ataques.length ? ficha.ataques.map((ataque) => <p key={ataque.nome}><span>{ataque.nome}</span><strong>{ataque.teste} · {ataque.dano} · {ataque.critico}</strong></p>) : <p><span>Nenhum</span><strong>—</strong></p>}
          </section>
          <section>
            <h3>Equipamentos</h3>
            {ficha.equipamentos.length ? ficha.equipamentos.slice(0, 8).map((item) => <p key={item}><span>{item}</span></p>) : <p><span>Nenhum</span></p>}
          </section>
          <section>
            <h3>Poderes</h3>
            {ficha.poderes.length ? ficha.poderes.map((poder) => <p key={poder.nome}><span>{poder.nome}</span></p>) : <p><span>Nenhum</span></p>}
          </section>
        </div>
      </section>
    </div>
  );
}

function Toast({ text, type, onClose }: { text: string; type: "ok" | "error" | "info"; onClose: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(id);
  }, [onClose]);
  return <div className={`toast ${type}`}>{text}<button onClick={onClose}><X size={14} /></button></div>;
}

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [fichas, setFichas] = useState<FichaResumo[]>([]);
  const [stats, setStats] = useState(emptyStats);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [gitBusy, setGitBusy] = useState(false);
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [detail, setDetail] = useState<Ficha | null>(null);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "error" | "info" } | null>(null);
  const headerInput = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    const [lista, gitInfo] = await Promise.all([listarFichas(), gitStatus().catch(() => null)]);
    setFichas(lista.fichas);
    setStats(lista.estatisticas);
    if (gitInfo) setGit(gitInfo);
  }

  useEffect(() => {
    refresh().catch((error) => setToast({ text: error.message, type: "error" }));
  }, []);

  async function handleUpload(file: File) {
    setBusy(true);
    try {
      const result = await enviarPdf(file);
      if (result.tipo === "nova") setToast({ text: `Ficha ${result.ficha.nome} salva em revisão.`, type: "ok" });
      if (result.tipo === "sem-alteracoes") setToast({ text: `A ficha ${result.ficha.nome} já estava atualizada.`, type: "info" });
      if (result.tipo === "revisao") {
        setRevisao(result.revisao);
        setToast({ text: `Alterações encontradas em ${result.revisao.nome}.`, type: "info" });
      }
      await refresh();
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Falha ao processar PDF.", type: "error" });
    } finally {
      setBusy(false);
      if (headerInput.current) headerInput.current.value = "";
    }
  }

  async function handleView(id: string) {
    try {
      setDetail(await obterFicha(id));
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Ficha não encontrada.", type: "error" });
    }
  }

  async function handleCompare(id: string) {
    try {
      setRevisao(await obterRevisao(id));
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Nenhuma revisão pendente.", type: "error" });
    }
  }

  async function handleApprove(id: string) {
    try {
      await atualizarStatus(id, "aprovado");
      await refresh();
      setToast({ text: "Ficha aprovada.", type: "ok" });
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Não foi possível aprovar.", type: "error" });
    }
  }

  async function handleApply(status: StatusFicha) {
    if (!revisao) return;
    setBusy(true);
    try {
      await aplicarRevisao(revisao.id, status);
      setRevisao(null);
      await refresh();
      setToast({ text: "Ficha atualizada com sucesso.", type: "ok" });
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Não foi possível aplicar revisão.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePull() {
    setGitBusy(true);
    try {
      const result = await gitPull();
      setGit(result.status);
      await refresh();
      setToast({ text: result.mensagem, type: result.sucesso ? "ok" : "error" });
    } finally {
      setGitBusy(false);
    }
  }

  async function handlePush() {
    setGitBusy(true);
    try {
      const result = await gitPush();
      setGit(result.status);
      setToast({ text: result.mensagem, type: result.sucesso ? "ok" : "error" });
    } finally {
      setGitBusy(false);
    }
  }

  async function handleApproveAll() {
    try {
      const result = await aprovarTodas();
      await refresh();
      setToast({ text: `${result.total} ficha(s) aprovada(s).`, type: "ok" });
    } catch (error) {
      setToast({ text: error instanceof Error ? error.message : "Não foi possível aprovar as fichas.", type: "error" });
    }
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} />
      <div className="main-shell">
        <header className="topbar">
          <div>
            <h1>Fichas de Personagens</h1>
            <p>Gerencie, revise e versione fichas de Tormenta RPG</p>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por personagem, jogador, classe ou status..." />
          </label>
          <button className="ghost" disabled={gitBusy} onClick={handlePull}><Download size={15} /> Puxar do GitHub</button>
          <button className="primary" disabled={busy} onClick={() => headerInput.current?.click()}><Upload size={15} /> Enviar PDF</button>
          <input ref={headerInput} className="hidden-input" type="file" accept="application/pdf,.pdf" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0])} />
        </header>
        <main>
          <SummaryCards stats={stats} />
          <div className="content-grid">
            <div className="left-column">
              <SheetsTable fichas={fichas} query={query} onView={handleView} onCompare={handleCompare} onApprove={handleApprove} />
              <section className="wide-card" id="upload-zone">
                <header><Upload size={16} /> Enviar Ficha</header>
                <UploadPanel busy={busy} onFile={handleUpload} />
              </section>
            </div>
            <div className="right-column">
              <GitHubCard status={git} busy={gitBusy} onPull={handlePull} onPush={handlePush} />
              <QuickActions onApproveAll={handleApproveAll} />
            </div>
          </div>
          <footer className="footer-line">
            <span>Arquivo Tormenta RPG · v1.0.0</span>
            <span>/data/fichas · {stats.total} registro(s)</span>
          </footer>
        </main>
      </div>
      {revisao && <ComparisonModal revisao={revisao} busy={busy} onClose={() => setRevisao(null)} onApply={handleApply} />}
      {detail && <DetailModal ficha={detail} onClose={() => setDetail(null)} />}
      {toast && <Toast text={toast.text} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
