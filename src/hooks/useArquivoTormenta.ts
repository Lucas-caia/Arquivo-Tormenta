import { useCallback, useEffect, useState } from "react";
import type {
  Estatisticas,
  Ficha,
  FichaResumo,
  GitStatus,
  Revisao,
  StatusFicha
} from "../../shared/types";
import {
  ApiError,
  aplicarRevisao,
  aprovarTodas,
  atualizarStatus,
  descartarRevisao,
  enviarPdf,
  gitPull,
  gitPush,
  gitStatus,
  listarFichas,
  obterFicha,
  obterRevisao
} from "../api/client";
import type { ToastMessage } from "../components/common/Toast";
import { validatePdfFile } from "../utils/fileValidation";

const emptyStats: Estatisticas = {
  total: 0,
  aprovadas: 0,
  emRevisao: 0,
  revisoesPendentes: 0,
  ultimaAtualizacao: "Sem registros"
};

function errorMessage(error: unknown, fallback: string): ToastMessage {
  if (error instanceof ApiError) {
    return { text: error.message, type: "error", details: error.details };
  }
  return {
    text: error instanceof Error ? error.message : fallback,
    type: "error"
  };
}

export function useArquivoTormenta() {
  const [fichas, setFichas] = useState<FichaResumo[]>([]);
  const [stats, setStats] = useState<Estatisticas>(emptyStats);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [gitBusy, setGitBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [detail, setDetail] = useState<Ficha | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const refreshFichas = useCallback(async () => {
    const result = await listarFichas();
    setFichas(result.fichas);
    setStats(result.estatisticas);
  }, []);

  const refreshGit = useCallback(async () => {
    const result = await gitStatus();
    setGit(result);
    return result;
  }, []);

  const refreshAll = useCallback(async () => {
    const [fichasResult, gitResult] = await Promise.allSettled([listarFichas(), gitStatus()]);
    if (fichasResult.status === "fulfilled") {
      setFichas(fichasResult.value.fichas);
      setStats(fichasResult.value.estatisticas);
    } else {
      throw fichasResult.reason;
    }
    if (gitResult.status === "fulfilled") setGit(gitResult.value);
  }, []);

  useEffect(() => {
    refreshAll()
      .catch((error) => setToast(errorMessage(error, "Não foi possível carregar o acervo.")))
      .finally(() => setLoading(false));
  }, [refreshAll]);

  const handleUpload = useCallback(async (file: File) => {
    try {
      await validatePdfFile(file);
    } catch (error) {
      setToast(errorMessage(error, "O arquivo selecionado não é válido."));
      return;
    }

    setUploadBusy(true);
    try {
      const result = await enviarPdf(file);
      if (result.tipo === "nova") {
        setToast({ text: `Ficha ${result.ficha.nome} salva em revisão.`, type: "ok" });
      } else if (result.tipo === "sem-alteracoes") {
        setToast({ text: `A ficha ${result.ficha.nome} já estava atualizada.`, type: "info" });
      } else {
        setRevisao(result.revisao);
        setToast({ text: `Alterações encontradas em ${result.revisao.nome}.`, type: "info" });
      }
      await refreshFichas();
    } catch (error) {
      setToast(errorMessage(error, "Falha ao processar o PDF."));
    } finally {
      setUploadBusy(false);
    }
  }, [refreshFichas]);

  const handleView = useCallback(async (id: string) => {
    try {
      setDetail(await obterFicha(id));
    } catch (error) {
      setToast(errorMessage(error, "Ficha não encontrada."));
    }
  }, []);

  const handleCompare = useCallback(async (id: string) => {
    try {
      setRevisao(await obterRevisao(id));
    } catch (error) {
      setToast(errorMessage(error, "Nenhuma revisão pendente."));
    }
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    setActionBusy(true);
    try {
      await atualizarStatus(id, "aprovado");
      await refreshFichas();
      setToast({ text: "Ficha aprovada.", type: "ok" });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível aprovar a ficha."));
    } finally {
      setActionBusy(false);
    }
  }, [refreshFichas]);

  const handleApplyRevision = useCallback(async (status: StatusFicha) => {
    if (!revisao) return;
    setActionBusy(true);
    try {
      await aplicarRevisao(revisao.id, status);
      setRevisao(null);
      await refreshFichas();
      setToast({ text: "Ficha atualizada com sucesso.", type: "ok" });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível aplicar a revisão."));
    } finally {
      setActionBusy(false);
    }
  }, [refreshFichas, revisao]);

  const handleDiscardRevision = useCallback(async () => {
    if (!revisao) return;
    const confirmed = window.confirm(`Descartar a revisão pendente de ${revisao.nome}? A ficha oficial será preservada.`);
    if (!confirmed) return;

    setActionBusy(true);
    try {
      await descartarRevisao(revisao.id);
      setRevisao(null);
      await refreshFichas();
      setToast({ text: "Revisão descartada. A ficha oficial não foi alterada.", type: "ok" });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível descartar a revisão."));
    } finally {
      setActionBusy(false);
    }
  }, [refreshFichas, revisao]);

  const handleApproveAll = useCallback(async () => {
    setActionBusy(true);
    try {
      const result = await aprovarTodas();
      await refreshFichas();
      setToast({ text: `${result.total} ficha(s) nova(s) aprovada(s).`, type: "ok" });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível aprovar as fichas."));
    } finally {
      setActionBusy(false);
    }
  }, [refreshFichas]);

  const handlePull = useCallback(async () => {
    setGitBusy(true);
    try {
      const result = await gitPull();
      setGit(result.status);
      if (result.sucesso) await refreshFichas();
      setToast({ text: result.mensagem, type: result.sucesso ? "ok" : "error", details: result.detalhes ? [result.detalhes] : undefined });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível puxar as alterações."));
    } finally {
      setGitBusy(false);
    }
  }, [refreshFichas]);

  const handlePush = useCallback(async () => {
    setGitBusy(true);
    try {
      const result = await gitPush();
      setGit(result.status);
      setToast({ text: result.mensagem, type: result.sucesso ? "ok" : "error", details: result.detalhes ? [result.detalhes] : undefined });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível enviar as alterações."));
    } finally {
      setGitBusy(false);
    }
  }, []);

  const closeRevision = useCallback(() => setRevisao(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  const handleRefreshGit = useCallback(async () => {
    setGitBusy(true);
    try {
      await refreshGit();
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível consultar o Git."));
    } finally {
      setGitBusy(false);
    }
  }, [refreshGit]);

  return {
    fichas,
    stats,
    git,
    loading,
    uploadBusy,
    gitBusy,
    actionBusy,
    revisao,
    detail,
    toast,
    handleUpload,
    handleView,
    handleCompare,
    handleApprove,
    handleApplyRevision,
    handleDiscardRevision,
    handleApproveAll,
    handlePull,
    handlePush,
    handleRefreshGit,
    closeRevision,
    closeDetail,
    closeToast
  };
}
