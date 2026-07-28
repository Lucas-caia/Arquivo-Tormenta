import { FileJson } from "lucide-react";
import type { Ficha } from "../../../shared/types";
import { formatDate } from "../../utils/format";
import { Modal } from "../common/Modal";
import { StatusBadge } from "../common/StatusBadge";

export function FichaDetailModal({ ficha, onClose }: { ficha: Ficha; onClose: () => void }) {
  return (
    <Modal
      title={ficha.nome}
      subtitle={`Versão ${ficha.historico.versao} · ${formatDate(ficha.historico.atualizadoEm)}`}
      eyebrow={<><FileJson size={16} aria-hidden="true" /> Ficha JSON</>}
      className="detail-modal"
      onClose={onClose}
    >
      <div className="detail-grid">
        <article><span>Jogador</span><strong>{ficha.jogador || "—"}</strong></article>
        <article><span>Raça</span><strong>{ficha.raca || "—"}</strong></article>
        <article><span>Origem</span><strong>{ficha.origem || "—"}</strong></article>
        <article><span>Classe</span><strong>{[ficha.classe, ficha.nivel].filter(Boolean).join(" ") || "—"}</strong></article>
        <article><span>PV</span><strong>{ficha.recursos.vidaAtual || ficha.recursos.vidaMaxima || "—"}/{ficha.recursos.vidaMaxima || "—"}</strong></article>
        <article><span>PM</span><strong>{ficha.recursos.manaAtual || ficha.recursos.manaMaxima || "—"}/{ficha.recursos.manaMaxima || "—"}</strong></article>
        <article><span>Defesa</span><strong>{ficha.defesa.total || "—"}</strong></article>
        <article><span>Status</span><StatusBadge status={ficha.status} /></article>
      </div>

      <div className="json-columns">
        <section>
          <h3>Atributos</h3>
          {Object.entries(ficha.atributos).map(([key, item]) => (
            <p key={key}><span>{key}</span><strong>{item || "—"}</strong></p>
          ))}
        </section>
        <section>
          <h3>Ataques</h3>
          {ficha.ataques.length ? ficha.ataques.map((ataque, index) => (
            <p key={`${ataque.nome}-${index}`}><span>{ataque.nome || `Ataque ${index + 1}`}</span><strong>{[ataque.teste, ataque.dano, ataque.critico].filter(Boolean).join(" · ") || "—"}</strong></p>
          )) : <p><span>Nenhum</span><strong>—</strong></p>}
        </section>
        <section>
          <h3>Equipamentos</h3>
          {ficha.equipamentos.length ? ficha.equipamentos.map((item, index) => (
            <p key={`${item}-${index}`}><span>{item}</span></p>
          )) : <p><span>Nenhum</span></p>}
        </section>
        <section>
          <h3>Poderes</h3>
          {ficha.poderes.length ? ficha.poderes.map((poder, index) => (
            <p key={`${poder.nome}-${index}`}><span>{poder.nome || `Poder ${index + 1}`}</span></p>
          )) : <p><span>Nenhum</span></p>}
        </section>
      </div>
    </Modal>
  );
}
