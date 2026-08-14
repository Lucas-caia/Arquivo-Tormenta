export type StatusFicha = "aprovado" | "em-revisao";

export type OrigemImportacao = "web" | "discord";

export type ImportacaoMetadata = {
  origem: OrigemImportacao;
  arquivoOriginal: string;
  recebidaEm: string;
  enviadoPor?: {
    id: string;
    nome: string;
  };
};

export type TipoDiferenca = "alterado" | "adicionado" | "removido";

export type Diferenca = {
  caminho: string;
  rotulo: string;
  antes: unknown;
  depois: unknown;
  tipo: TipoDiferenca;
};

export type Ataque = {
  nome: string;
  teste: string;
  dano: string;
  critico: string;
  tipo: string;
  alcance: string;
};

export type Pericia = {
  nome: string;
  total: string;
  atributo: string;
  treino: string;
  outros: string;
  treinado: boolean;
};

export type Poder = {
  nome: string;
  descricao: string;
};

export type FichaResumo = {
  id: string;
  nome: string;
  jogador: string;
  raca: string;
  origem: string;
  classe: string;
  nivel: string;
  status: StatusFicha;
  atualizadoEm: string;
  temRevisao: boolean;
};

export type Ficha = FichaResumo & {
  divindade: string;
  atributos: Record<string, string>;
  recursos: Record<string, string>;
  defesa: Record<string, string>;
  armadurasEscudos: Array<Record<string, string>>;
  ataques: Ataque[];
  pericias: Pericia[];
  proficiencias: string[];
  equipamentos: string[];
  poderes: Poder[];
  magias: string[];
  historico: {
    criadoEm: string;
    atualizadoEm: string;
    versao: number;
  };
  camposOriginais: Record<string, string>;
  importacao?: ImportacaoMetadata;
};

export type Revisao = {
  id: string;
  fichaId: string;
  nome: string;
  criadaEm: string;
  importacao?: ImportacaoMetadata;
  atual: Ficha;
  nova: Ficha;
  diferencas: Diferenca[];
};

export type Estatisticas = {
  total: number;
  aprovadas: number;
  emRevisao: number;
  revisoesPendentes: number;
  ultimaAtualizacao: string;
};

export type ListaFichasResponse = {
  fichas: FichaResumo[];
  estatisticas: Estatisticas;
};

export type UploadResponse =
  | { tipo: "nova"; ficha: Ficha }
  | { tipo: "sem-alteracoes"; ficha: Ficha }
  | { tipo: "revisao"; revisao: Revisao };

export type GitSyncScope = "fichas" | "revisoes";

export type GitCommitStyle = "descritivo" | "conventional" | "personalizado";

export type GitSettings = {
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
};

export type GitStatus = {
  conectado: boolean;
  gitDisponivel: boolean;
  chaveConfigurada: boolean;
  configurado: boolean;
  repositorioInicializado: boolean;
  remoteUrl: string;
  branch: string;
  alterados: string[];
  mensagem: string;
  verificadoEm?: string;
  atualizadoEm: string;
};

export type GitSettingsResponse = {
  settings: GitSettings;
  status: GitStatus;
};

export type GitConnectionResponse = {
  sucesso: true;
  mensagem: string;
  branches: string[];
  status: GitStatus;
};

export type GitPreview = {
  fingerprint: string;
  branch: string;
  remoteUrl: string;
  arquivos: Array<{
    status: string;
    caminho: string;
  }>;
  total: number;
  novasFichas: number;
  fichasAtualizadas: number;
  revisoesAlteradas: number;
  mensagemCommit: string;
};

export type GitActionResponse = {
  sucesso: boolean;
  mensagem: string;
  detalhes: string;
  status: GitStatus;
};

export type ApiErrorPayload = {
  erro: string;
  codigo?: string;
  detalhes?: string[];
};
