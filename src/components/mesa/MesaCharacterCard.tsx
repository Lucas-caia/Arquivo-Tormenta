import {
  Activity,
  BookOpen,
  Eye,
  Footprints,
  Heart,
  Shield,
  Sparkles,
  Swords,
  X
} from "lucide-react";
import type { Ficha, Pericia } from "../../../shared/types";
import { StatusBadge } from "../common/StatusBadge";
import { ClassIcon } from "../fichas/ClassIcon";

function displayValue(value?: string) {
  return value?.trim() || "—";
}

function resourceValue(current?: string, maximum?: string) {
  const max = maximum?.trim() || "";
  const now = current?.trim() || max;
  if (!now && !max) return "—";
  return `${now || "—"} / ${max || "—"}`;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

const prioritySkillNames = ["iniciativa", "percepcao", "fortitude", "reflexos", "vontade"];

function prioritySkills(pericias: Pericia[]) {
  return prioritySkillNames
    .map((name) => pericias.find((pericia) => normalizeText(pericia.nome) === name))
    .filter((pericia): pericia is Pericia => Boolean(pericia));
}

function attributeLabel(key: string) {
  const normalized = normalizeText(key);
  const labels: Record<string, string> = {
    forca: "FOR",
    destreza: "DES",
    constituicao: "CON",
    inteligencia: "INT",
    sabedoria: "SAB",
    carisma: "CAR"
  };
  return labels[normalized] ?? key.slice(0, 3).toLocaleUpperCase("pt-BR");
}

export function MesaCharacterCard({
  ficha,
  onRemove,
  onView
}: {
  ficha: Ficha;
  onRemove: () => void;
  onView: () => void;
}) {
  const highlightedSkills = prioritySkills(ficha.pericias);
  const sortedSkills = [...ficha.pericias].sort((left, right) => {
    if (left.treinado !== right.treinado) return left.treinado ? -1 : 1;
    return left.nome.localeCompare(right.nome, "pt-BR");
  });

  return (
    <article className="mesa-character-card">
      <header className="mesa-character-header">
        <div className="mesa-character-identity">
          <span className="mesa-character-icon"><ClassIcon classe={ficha.classe} /></span>
          <div>
            <div className="mesa-character-title-line">
              <h2>{ficha.nome}</h2>
              <StatusBadge status={ficha.status} />
            </div>
            <p>
              {[ficha.raca, ficha.classe && `${ficha.classe} ${ficha.nivel ? `Nv. ${ficha.nivel}` : ""}`]
                .filter(Boolean)
                .join(" · ") || "Personagem"}
            </p>
            {ficha.jogador ? <small>Jogador: {ficha.jogador}</small> : null}
          </div>
        </div>
        <div className="mesa-character-actions">
          <button className="icon-button" onClick={onView} title="Abrir ficha completa" aria-label={`Abrir ficha completa de ${ficha.nome}`}>
            <Eye size={16} aria-hidden="true" />
          </button>
          <button className="icon-button mesa-remove-button" onClick={onRemove} title="Remover da mesa" aria-label={`Remover ${ficha.nome} da mesa`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="mesa-vitals" aria-label={`Recursos principais de ${ficha.nome}`}>
        <div className="mesa-vital mesa-vital-life">
          <span><Heart size={15} aria-hidden="true" /> PV</span>
          <strong>{resourceValue(ficha.recursos.vidaAtual, ficha.recursos.vidaMaxima)}</strong>
        </div>
        <div className="mesa-vital mesa-vital-mana">
          <span><Sparkles size={15} aria-hidden="true" /> PM</span>
          <strong>{resourceValue(ficha.recursos.manaAtual, ficha.recursos.manaMaxima)}</strong>
        </div>
        <div className="mesa-vital">
          <span><Shield size={15} aria-hidden="true" /> Defesa</span>
          <strong>{displayValue(ficha.defesa.total)}</strong>
        </div>
        <div className="mesa-vital">
          <span><Footprints size={15} aria-hidden="true" /> Desloc.</span>
          <strong>{ficha.recursos.deslocamento ? `${ficha.recursos.deslocamento}m` : "—"}</strong>
        </div>
      </section>

      <section className="mesa-attributes" aria-label={`Atributos de ${ficha.nome}`}>
        {Object.entries(ficha.atributos).map(([key, value]) => (
          <div key={key}>
            <span>{attributeLabel(key)}</span>
            <strong>{displayValue(value)}</strong>
          </div>
        ))}
      </section>

      {highlightedSkills.length ? (
        <section className="mesa-quick-section">
          <div className="mesa-section-heading">
            <span><Activity size={15} aria-hidden="true" /> Testes rápidos</span>
          </div>
          <div className="mesa-skill-strip">
            {highlightedSkills.map((pericia) => (
              <div key={pericia.nome}>
                <span>{pericia.nome}</span>
                <strong>{displayValue(pericia.total)}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mesa-quick-section">
        <div className="mesa-section-heading">
          <span><Swords size={15} aria-hidden="true" /> Ataques</span>
          <small>{ficha.ataques.length}</small>
        </div>
        <div className="mesa-attack-list">
          {ficha.ataques.length ? ficha.ataques.slice(0, 3).map((ataque, index) => (
            <div className="mesa-attack-row" key={`${ataque.nome}-${index}`}>
              <strong>{ataque.nome || `Ataque ${index + 1}`}</strong>
              <span>{[ataque.teste, ataque.dano, ataque.critico].filter(Boolean).join(" · ") || "—"}</span>
            </div>
          )) : <p className="mesa-empty-inline">Nenhum ataque registrado.</p>}
        </div>
      </section>

      <details className="mesa-character-details">
        <summary><BookOpen size={15} aria-hidden="true" /> Consultar mais informações</summary>
        <div className="mesa-detail-sections">
          <section>
            <h3>Defesa e recursos</h3>
            <div className="mesa-detail-grid">
              <p><span>Defesa base</span><strong>{displayValue(ficha.defesa.base)}</strong></p>
              <p><span>Armadura</span><strong>{displayValue(ficha.defesa.armadura)}</strong></p>
              <p><span>Escudo</span><strong>{displayValue(ficha.defesa.escudo)}</strong></p>
              <p><span>Resistência</span><strong>{displayValue(ficha.recursos.resistencia)}</strong></p>
              <p><span>Carga</span><strong>{resourceValue(ficha.recursos.cargaAtual, ficha.recursos.cargaMaxima)}</strong></p>
              <p><span>Tamanho</span><strong>{displayValue(ficha.recursos.tamanho)}</strong></p>
            </div>
          </section>

          <section>
            <h3>Todos os ataques</h3>
            {ficha.ataques.length ? (
              <div className="mesa-detail-list">
                {ficha.ataques.map((ataque, index) => (
                  <p key={`${ataque.nome}-${index}`}>
                    <strong>{ataque.nome || `Ataque ${index + 1}`}</strong>
                    <span>{[ataque.teste, ataque.dano, ataque.critico, ataque.tipo, ataque.alcance].filter(Boolean).join(" · ") || "—"}</span>
                  </p>
                ))}
              </div>
            ) : <p className="mesa-empty-inline">Nenhum ataque registrado.</p>}
          </section>

          <section>
            <h3>Perícias</h3>
            <div className="mesa-skills-grid">
              {sortedSkills.map((pericia) => (
                <p key={pericia.nome} className={pericia.treinado ? "trained" : ""}>
                  <span>{pericia.nome}</span>
                  <strong>{displayValue(pericia.total)}</strong>
                </p>
              ))}
            </div>
          </section>

          <section>
            <h3>Poderes e magias</h3>
            <div className="mesa-text-list">
              {ficha.poderes.map((poder, index) => (
                <div key={`${poder.nome}-${index}`}>
                  <strong>{poder.nome || `Poder ${index + 1}`}</strong>
                  {poder.descricao ? <p>{poder.descricao}</p> : null}
                </div>
              ))}
              {ficha.magias.map((magia, index) => <div key={`${magia}-${index}`}><strong>{magia}</strong></div>)}
              {!ficha.poderes.length && !ficha.magias.length ? <p className="mesa-empty-inline">Nenhum poder ou magia registrado.</p> : null}
            </div>
          </section>

          <section>
            <h3>Equipamentos</h3>
            {ficha.equipamentos.length ? (
              <div className="mesa-chip-list">
                {ficha.equipamentos.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}
              </div>
            ) : <p className="mesa-empty-inline">Nenhum equipamento registrado.</p>}
          </section>
        </div>
      </details>
    </article>
  );
}

export function MesaCharacterSkeleton({ nome, onRemove }: { nome: string; onRemove: () => void }) {
  return (
    <article className="mesa-character-card mesa-character-loading" aria-label={`Carregando ficha de ${nome}`} aria-busy="true">
      <header className="mesa-character-header">
        <div>
          <h2>{nome}</h2>
          <p>Carregando informações da ficha...</p>
        </div>
        <button className="icon-button mesa-remove-button" onClick={onRemove} title="Cancelar" aria-label={`Cancelar carregamento de ${nome}`}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <div className="mesa-skeleton-line wide" />
      <div className="mesa-skeleton-grid">
        <span /><span /><span /><span />
      </div>
      <div className="mesa-skeleton-line" />
      <div className="mesa-skeleton-line short" />
    </article>
  );
}
