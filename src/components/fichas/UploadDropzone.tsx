import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";

export type UploadDropzoneProps = {
  busy: boolean;
  onFile: (file: File) => void;
};

export function UploadDropzone({ busy, onFile }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`upload-panel ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <div className="upload-icon"><FileText size={28} aria-hidden="true" /></div>
      <strong>Arraste a ficha em PDF aqui</strong>
      <span>
        O arquivo é validado, processado em memória e descartado. Somente o JSON extraído é armazenado.
      </span>
      <button className="button primary" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload size={15} aria-hidden="true" />
        {busy ? "Processando ficha..." : "Selecionar PDF"}
      </button>
      <small>Modelo preenchível suportado · limite de 12 MB</small>
      <input
        ref={inputRef}
        className="hidden-input"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
