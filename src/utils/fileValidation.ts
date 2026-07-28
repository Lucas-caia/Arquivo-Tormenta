const MAX_PDF_SIZE = 12 * 1024 * 1024;
const PDF_SIGNATURE = "%PDF-";

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FileValidationError";
  }
}

export async function validatePdfFile(file: File) {
  if (!file.size) {
    throw new FileValidationError("O arquivo está vazio.");
  }

  if (file.size > MAX_PDF_SIZE) {
    throw new FileValidationError("O PDF excede o limite de 12 MB.");
  }

  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  const hasPdfMime = file.type === "application/pdf" || file.type === "application/x-pdf";
  if (!hasPdfExtension && !hasPdfMime) {
    throw new FileValidationError("Selecione um arquivo PDF válido.");
  }

  const signature = await file.slice(0, PDF_SIGNATURE.length).text();
  if (signature !== PDF_SIGNATURE) {
    throw new FileValidationError("O arquivo selecionado não possui uma assinatura PDF válida.");
  }
}
