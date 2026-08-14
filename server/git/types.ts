export type GitSyncScope = "fichas" | "revisoes";
export type GitCommitStyle = "descritivo" | "conventional" | "personalizado";

export type GitSettingsInternal = {
  remoteUrl: string;
  branch: string;
  escopos: Record<GitSyncScope, boolean>;
  estiloCommit: GitCommitStyle;
  templates: {
    novaFicha: string;
    fichaAtualizada: string;
    multiplasAlteracoes: string;
  };
  autor: {
    nome: string;
    email: string;
  };
  verificadoEm?: string;
};

export type PreparedGitChange = {
  status: string;
  path: string;
};
