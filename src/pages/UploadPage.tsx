import { AlertTriangle, CheckCircle, FileCheck, ShieldCheck } from "lucide-react";
import { UploadDropzone } from "../components/fichas/UploadDropzone";

export function UploadPage({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  return (
    <div className="upload-page-grid">
      <section className="wide-card">
        <header><span><FileCheck size={17} aria-hidden="true" /> Importação segura</span></header>
        <UploadDropzone busy={busy} onFile={onFile} />
      </section>

      <aside className="upload-guidance">
        <section className="side-card">
          <header><span><ShieldCheck size={17} aria-hidden="true" /> Validações realizadas</span></header>
          <ul className="check-list">
            <li><CheckCircle size={15} aria-hidden="true" /> tamanho máximo de 12 MB;</li>
            <li><CheckCircle size={15} aria-hidden="true" /> extensão, tipo e assinatura PDF;</li>
            <li><CheckCircle size={15} aria-hidden="true" /> presença de formulário preenchível;</li>
            <li><CheckCircle size={15} aria-hidden="true" /> campo <code>Nome</code> preenchido;</li>
            <li><CheckCircle size={15} aria-hidden="true" /> comparação antes de substituir uma ficha existente.</li>
          </ul>
        </section>

        <section className="side-card warning-card">
          <header><span><AlertTriangle size={17} aria-hidden="true" /> Modelo suportado</span></header>
          <p>O parser continua usando exatamente os campos do modelo de Tormenta já configurado. PDFs escaneados, protegidos ou de outro modelo são rejeitados com uma mensagem específica.</p>
          <p>O PDF bruto nunca é salvo. Se a extração falhar, nenhum JSON existente é alterado.</p>
        </section>
      </aside>
    </div>
  );
}
