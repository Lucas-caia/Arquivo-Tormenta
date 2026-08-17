import { useCallback, useState } from "react";
import type { Ficha } from "../../shared/types";
import { ApiError, obterFicha } from "../api/client";

function mesaErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Não foi possível carregar a ficha.";
}

export function useMesa() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fichas, setFichas] = useState<Record<string, Ficha>>({});
  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFicha = useCallback(async (id: string) => {
    if (selectedIds.includes(id)) return;
    setSelectedIds((current) => [...current, id]);

    setError(null);
    setLoadingIds((current) => [...current, id]);

    try {
      const ficha = await obterFicha(id);
      setFichas((current) => ({ ...current, [id]: ficha }));
    } catch (loadError) {
      setSelectedIds((current) => current.filter((item) => item !== id));
      setError(mesaErrorMessage(loadError));
    } finally {
      setLoadingIds((current) => current.filter((item) => item !== id));
    }
  }, [selectedIds]);

  const removeFicha = useCallback((id: string) => {
    setSelectedIds((current) => current.filter((item) => item !== id));
    setLoadingIds((current) => current.filter((item) => item !== id));
    setFichas((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const clearMesa = useCallback(() => {
    setSelectedIds([]);
    setLoadingIds([]);
    setFichas({});
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    selectedIds,
    fichas,
    loadingIds,
    error,
    addFicha,
    removeFicha,
    clearMesa,
    clearError
  };
}

export type MesaController = ReturnType<typeof useMesa>;
