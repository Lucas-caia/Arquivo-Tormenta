import { useCallback, useEffect, useState } from "react";
import type {
  Estatisticas,
  Ficha,
  FichaResumo,
  GitPreview,
  GitSettings,
  GitStatus,
  Revisao,
  StatusFicha
} from "../../shared/types";
import {
  ApiError,
  aplicarRevisao,
  aprovarTodas,
  atualizarStatus,
  deletarFicha,
  descartarRevisao,
  enviarPdf,
  gitPreviewPush,
  gitPull,
  gitPush,
  gitSettings,
  gitStatus,
  obterFicha,
  obterRevisao,
  listarFichas,
  salvarGitSettings,
  verificarGit
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
  const [gitConfig, setGitConfig] = useState<GitSettings | null>(null);
  const [gitBranches, setGitBranches] = useState<string[]>([]);
  const [gitPreview, setGitPreview] = useState<GitPreview | null>(null);
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
    // Uma prévia representa um snapshot do acervo. Qualquer atualização local
    // invalida esse snapshot para não exibir um Push antigo como se fosse atual.
    setGitPreview(null);
  }, []);

  const refreshGit = useCallback(async () => {
    const result = await gitStatus();
    setGit(result);
    return result;
  }, []);

  const refreshAll = useCallback(async () => {
    const [fichasResult, gitResult, settingsResult] = await Promise.allSettled([
      listarFichas(),
      gitStatus(),
      gitSettings()
    ]);

    if (fichasResult.status === "fulfilled") {
      setFichas(fichasResult.value.fichas);
      setStats(fichasResult.value.estatisticas);
    } else {
      throw fichasResult.reason;
    }

    if (gitResult.status === "fulfilled") setGit(gitResult.value);
    if (settingsResult.status === "fulfilled") setGitConfig(settingsResult.value);
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

  const handleDelete = useCallback(async (ficha: FichaResumo) => {
    const revisionWarning = ficha.temRevisao
      ? " A revisão pendente desta ficha também será removida."
      : "";
    const confirmed = window.confirm(
      `Excluir permanentemente a ficha ${ficha.nome}?${revisionWarning} Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return false;

    setActionBusy(true);
    try {
      const result = await deletarFicha(ficha.id);
      if (detail?.id === ficha.id) setDetail(null);
      if (revisao?.fichaId === ficha.id) setRevisao(null);
      await refreshFichas();
      setToast({
        text: result.revisaoRemovida
          ? `Ficha ${ficha.nome} e sua revisão pendente foram excluídas.`
          : `Ficha ${ficha.nome} excluída.`,
        type: "ok"
      });
      return true;
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível excluir a ficha."));
      return false;
    } finally {
      setActionBusy(false);
    }
  }, [detail, refreshFichas, revisao]);

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

  const handleSaveGitSettings = useCallback(async (settings: GitSettings) => {
    setGitBusy(true);
    try {
      const result = await salvarGitSettings(settings);
      setGitConfig(result.settings);
      setGit(result.status);
      setGitPreview(null);
      setGitBranches([]);
      setToast({ text: "Configurações Git salvas.", type: "ok" });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível salvar as configurações Git."));
      throw error;
    } finally {
      setGitBusy(false);
    }
  }, []);

  const handleVerifyGit = useCallback(async () => {
    setGitBusy(true);
    try {
      const result = await verificarGit();
      setGit(result.status);
      setGitBranches(result.branches);
      setToast({ text: result.mensagem, type: "ok" });
    } catch (error) {
      setToast(errorMessage(error, "Não foi possível verificar a conexão SSH."));
    } finally {
      setGitBusy(false);
    }
  }, []);

  const handlePreparePush = useCallback(async () => {
    setGitBusy(true);
    try {
      const preview = await gitPreviewPush();
      setGitPreview(preview);
      setToast({
        text: preview.total
          ? `Prévia preparada com ${preview.total} arquivo(s).`
          : "Não há alterações selecionadas para enviar.",
        type: preview.total ? "info" : "ok"
      });
    } catch (error) {
      setGitPreview(null);
      setToast(errorMessage(error, "Não foi possível preparar o Push."));
    } finally {
      setGitBusy(false);
    }
  }, []);

  const handleConfirmPush = useCallback(async () => {
    if (!gitPreview?.fingerprint) return;
    setGitBusy(true);
    try {
      const result = await gitPush(gitPreview.fingerprint);
      setGit(result.status);
      setGitPreview(null);
      setToast({ text: result.mensagem, type: result.sucesso ? "ok" : "error", details: result.detalhes ? [result.detalhes] : undefined });
    } catch (error) {
      setGitPreview(null);
      setToast(errorMessage(error, "Não foi possível enviar as alterações."));
    } finally {
      setGitBusy(false);
    }
  }, [gitPreview]);

  const handleCancelPush = useCallback(() => setGitPreview(null), []);

  const handlePull = useCallback(async () => {
    const confirmed = window.confirm(
      "O Pull compara o acervo local com o GitHub e só aplica mudanças quando puder preservar seus arquivos. Deseja continuar?"
    );
    if (!confirmed) return;

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

  const closeRevision = useCallback(() => setRevisao(null), []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeToast = useCallback(() => setToast(null), []);

  return {
    fichas,
    stats,
    git,
    gitConfig,
    gitBranches,
    gitPreview,
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
    handleDelete,
    handleApplyRevision,
    handleDiscardRevision,
    handleApproveAll,
    handleSaveGitSettings,
    handleVerifyGit,
    handlePreparePush,
    handleConfirmPush,
    handleCancelPush,
    handlePull,
    handleRefreshGit,
    closeRevision,
    closeDetail,
    closeToast
  };
}
