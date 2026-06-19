export type StatusFicha = "aprovado" | "em-revisao";

export type Diferenca = {
  caminho: string;
  rotulo: string;
  antes: unknown;
  depois: unknown;
  tipo: "alterado" | "adicionado" | "removido";
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
};

export type Revisao = {
  id: string;
  fichaId: string;
  nome: string;
  criadaEm: string;
  atual: Ficha;
  nova: Ficha;
  diferencas: Diferenca[];
};

export type Estatisticas = {
  total: number;
  aprovadas: number;
  emRevisao: number;
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

export type GitStatus = {
  conectado: boolean;
  branch: string;
  alterados: string[];
  mensagem: string;
  atualizadoEm: string;
};

export type GitActionResponse = {
  sucesso: boolean;
  mensagem: string;
  detalhes: string;
  status: GitStatus;
};
