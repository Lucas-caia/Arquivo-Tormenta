import { badRequest, payloadTooLarge, unsupportedMedia } from "./errors.js";

const fichaIdPattern = /^[a-z0-9](?:[a-z0-9-]{0,98}[a-z0-9])?$/;
const pdfSignature = "%PDF-";

export function assertValidFichaId(id: string) {
  if (!fichaIdPattern.test(id)) {
    throw badRequest("INVALID_ID", "O identificador da ficha é inválido.");
  }
  return id;
}

type UploadedPdf = {
  size: number;
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

export function validatePdfUpload(file: UploadedPdf, maxBytes: number) {
  if (!file.size || !file.buffer.length) {
    throw badRequest("EMPTY_FILE", "O arquivo enviado está vazio.");
  }

  if (file.size > maxBytes) {
    throw payloadTooLarge("O PDF excede o limite de 12 MB.");
  }

  const hasPdfExtension = file.originalname.toLowerCase().endsWith(".pdf");
  const hasPdfMime = file.mimetype === "application/pdf" || file.mimetype === "application/x-pdf";
  if (!hasPdfExtension && !hasPdfMime) {
    throw unsupportedMedia("Envie um arquivo com formato PDF.");
  }

  const signature = file.buffer.subarray(0, pdfSignature.length).toString("ascii");
  if (signature !== pdfSignature) {
    throw unsupportedMedia("O arquivo não possui uma assinatura PDF válida.");
  }
}
