import { useMemo, useState, type ChangeEvent } from "react";
import { Check, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import type { FichaResumo } from "../../shared/types";
import { ClassIcon } from "../components/fichas/ClassIcon";
import { MesaCharacterCard, MesaCharacterSkeleton } from "../components/mesa/MesaCharacterCard";
import type { MesaController } from "../hooks/useMesa";
import "../mesa.css";

function searchableFicha(ficha: FichaResumo) {
  return [ficha.nome, ficha.jogador, ficha.raca, ficha.origem, ficha.classe, ficha.nivel]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
}

export function MesaPage({
  fichas,
  onView,
  mesa
}: {
  fichas: FichaResumo[];
  onView: (id: string) => void;
  mesa: MesaController;
}) {
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(mesa.selectedIds), [mesa.selectedIds]);

  const filteredFichas = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return fichas;
    return fichas.filter((ficha) => searchableFicha(ficha).includes(normalized));
  }, [fichas, query]);

  const summaryById = useMemo(
    () => new Map(fichas.map((ficha) => [ficha.id, ficha])),
    [fichas]
  );

  return (
    <div className="mesa-page">
      {mesa.error ? (
        <div className="mesa-error" role="alert">
          <span>{mesa.error}</span>
          <button className="icon-button" onClick={mesa.clearError} aria-label="Fechar aviso"><X size={15} aria-hidden="true" /></button>
        </div>
      ) : null}

      <div className="mesa-layout">
        <aside className="mesa-catalog" aria-label="Acervo de fichas">
          <div className="mesa-catalog-header">
            <div>
              <span className="mesa-eyebrow"><UsersRound size={15} aria-hidden="true" /> Acervo</span>
              <h2>Adicionar personagens</h2>
              <p>Todas as fichas continuam no acervo. A mesa continua disponível ao navegar pelo sistema e é descartada ao recarregar ou fechar a aplicação.</p>
            </div>
          </div>

          <label className="mesa-search">
            <Search size={15} aria-hidden="true" />
            <span className="sr-only">Buscar ficha para a mesa</span>
            <input
              value={query}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
              placeholder="Nome, jogador, classe..."
              autoComplete="off"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca"><X size={14} aria-hidden="true" /></button>
            ) : null}
          </label>

          <div className="mesa-catalog-count">
            <span>{filteredFichas.length} ficha(s)</span>
            <span>{mesa.selectedIds.length} na mesa</span>
          </div>

          <div className="mesa-catalog-list">
            {filteredFichas.map((ficha) => {
              const selected = selectedSet.has(ficha.id);
              const loading = mesa.loadingIds.includes(ficha.id);
              return (
                <button
                  className={`mesa-catalog-item${selected ? " selected" : ""}`}
                  key={ficha.id}
                  disabled={selected}
                  onClick={() => void mesa.addFicha(ficha.id)}
                  aria-label={selected ? `${ficha.nome} já está na mesa` : `Adicionar ${ficha.nome} à mesa`}
                >
                  <span className="mesa-catalog-icon"><ClassIcon classe={ficha.classe} /></span>
                  <span className="mesa-catalog-copy">
                    <strong>{ficha.nome}</strong>
                    <small>{[ficha.classe, ficha.nivel && `Nv. ${ficha.nivel}`].filter(Boolean).join(" · ") || ficha.raca || "Ficha"}</small>
                    {ficha.jogador ? <small className="mesa-player-name">{ficha.jogador}</small> : null}
                  </span>
                  <span className="mesa-add-indicator" aria-hidden="true">
                    {loading ? <span className="mesa-mini-loader" /> : selected ? <Check size={16} /> : <Plus size={16} />}
                  </span>
                </button>
              );
            })}

            {!filteredFichas.length ? (
              <div className="mesa-catalog-empty">
                <Search size={22} aria-hidden="true" />
                <strong>Nenhuma ficha encontrada</strong>
                <span>Tente buscar por outro nome, classe ou jogador.</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="mesa-workspace" aria-label="Mesa do mestre">
          <header className="mesa-workspace-header">
            <div>
              <span className="mesa-eyebrow">Mesa temporária</span>
              <h1>Mesa do mestre</h1>
              <p>Recursos vitais, defesa, atributos, testes e ataques ficam na frente. Abra os detalhes somente quando precisar.</p>
            </div>
            {mesa.selectedIds.length ? (
              <button className="button mesa-clear-button" onClick={mesa.clearMesa}>
                <Trash2 size={15} aria-hidden="true" /> Limpar mesa
              </button>
            ) : null}
          </header>

          {mesa.selectedIds.length ? (
            <div className="mesa-character-grid">
              {mesa.selectedIds.map((id) => {
                const ficha = mesa.fichas[id];
                const summary = summaryById.get(id);
                if (!ficha) {
                  return (
                    <MesaCharacterSkeleton
                      key={id}
                      nome={summary?.nome ?? "Ficha"}
                      onRemove={() => mesa.removeFicha(id)}
                    />
                  );
                }
                return (
                  <MesaCharacterCard
                    key={id}
                    ficha={ficha}
                    onRemove={() => mesa.removeFicha(id)}
                    onView={() => onView(id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="mesa-empty-state">
              <span className="mesa-empty-icon"><UsersRound size={32} aria-hidden="true" /></span>
              <h2>Sua mesa está vazia</h2>
              <p>Escolha as fichas no acervo ao lado. Elas aparecerão aqui imediatamente, organizadas para consulta rápida durante a sessão.</p>
              <div className="mesa-empty-hints">
                <span><HeartHint /> PV e PM primeiro</span>
                <span><ShieldHint /> Defesa em destaque</span>
                <span><Search size={14} aria-hidden="true" /> Busca instantânea</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function HeartHint() {
  return <span className="mesa-hint-dot life" aria-hidden="true" />;
}

function ShieldHint() {
  return <span className="mesa-hint-dot defense" aria-hidden="true" />;
}
