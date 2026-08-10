import { AlertTriangle, CheckCircle, GitCompare, Trash2 } from "lucide-react";
import type { Diferenca, Revisao, StatusFicha } from "../../../shared/types";
import { formatDate, importSourceLabel, valueText } from "../../utils/format";
import { Modal } from "../common/Modal";

function DiffValue({ value }: { value: unknown }) {
  return <pre>{valueText(value)}</pre>;
}

function DifferenceRow({ difference }: { difference: Diferenca }) {
  return (
    <div className="diff-row">
      <strong>{difference.rotulo}</strong>
      <DiffValue value={difference.antes} />
      <DiffValue value={difference.depois} />
    </div>
  );
}

export function ComparisonModal({
  revisao,
  busy,
  onClose,
  onApply,
  onDiscard
}: {
  revisao: Revisao;
  busy: boolean;
  onClose: () => void;
  onApply: (status: StatusFicha) => void;
  onDiscard: () => void;
}) {
  return (
    <Modal
      title={revisao.nome}
      subtitle={`${revisao.diferencas.length} alteração(ões) encontrada(s).`}
      eyebrow={<><GitCompare size={16} aria-hidden="true" /> Comparação de alterações</>}
      className="diff-modal"
      onClose={onClose}
      footer={(
        <>
          <button className="button danger" disabled={busy} onClick={onDiscard}><Trash2 size={15} aria-hidden="true" /> Descartar revisão</button>
          <button className="button" onClick={onClose}>Fechar</button>
          <button className="button" disabled={busy} onClick={() => onApply("em-revisao")}>Atualizar e manter em revisão</button>
          <button className="button primary" disabled={busy} onClick={() => onApply("aprovado")}>
            <CheckCircle size={15} aria-hidden="true" /> Aprovar e atualizar
          </button>
        </>
      )}
    >
      {revisao.importacao ? (
        <div className="import-metadata">
          <strong>Origem: {importSourceLabel(revisao.importacao.origem)}</strong>
          <span>Arquivo: {revisao.importacao.arquivoOriginal}</span>
          <span>Recebida em: {formatDate(revisao.importacao.recebidaEm)}</span>
          {revisao.importacao.enviadoPor ? (
            <span>Enviada por: {revisao.importacao.enviadoPor.nome}</span>
          ) : null}
        </div>
      ) : null}

      <div className="alert-box">
        <AlertTriangle size={17} aria-hidden="true" />
        A ficha oficial ainda não foi alterada. Revise os campos antes de aplicar esta versão.
      </div>
      <div className="diff-table">
        <div className="diff-head">Campo</div>
        <div className="diff-head before">Antes</div>
        <div className="diff-head after">Depois</div>
        {revisao.diferencas.map((difference) => (
          <DifferenceRow difference={difference} key={difference.caminho} />
        ))}
      </div>
    </Modal>
  );
}
