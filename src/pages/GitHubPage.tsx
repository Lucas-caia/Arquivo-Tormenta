import { FolderGit2, LockKeyhole, Users } from "lucide-react";
import type { GitStatus } from "../../shared/types";
import { GitHubCard } from "../components/git/GitHubCard";

export function GitHubPage({
  status,
  busy,
  onRefresh,
  onPull,
  onPush
}: {
  status: GitStatus | null;
  busy: boolean;
  onRefresh: () => void;
  onPull: () => void;
  onPush: () => void;
}) {
  return (
    <div className="github-page-grid">
      <GitHubCard status={status} busy={busy} onRefresh={onRefresh} onPull={onPull} onPush={onPush} expanded />
      <aside className="stacked-sections">
        <section className="side-card policy-card">
          <header><span><LockKeyhole size={17} aria-hidden="true" /> Política de acesso</span></header>
          <p>O projeto foi projetado para um ambiente privado e controlado, sem uma camada de contas de usuário.</p>
          <p>O acesso à interface depende de quem consegue alcançar a máquina onde ela roda. A permissão de enviar alterações depende das credenciais Git configuradas nesse ambiente.</p>
        </section>
        <section className="side-card policy-card">
          <header><span><Users size={17} aria-hidden="true" /> Uso previsto</span></header>
          <p>Uso pessoal ou por um grupo pequeno de pessoas confiáveis. Caso o projeto seja exposto fora desse ambiente, a política deverá ser revista antes da publicação.</p>
        </section>
        <section className="side-card policy-card">
          <header><span><FolderGit2 size={17} aria-hidden="true" /> Escopo do push</span></header>
          <p>A aplicação prepara apenas as pastas <code>data/fichas</code> e <code>data/revisoes</code>. Outras alterações do repositório não devem entrar no commit automático.</p>
        </section>
      </aside>
    </div>
  );
}
