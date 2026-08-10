import type { Attachment } from "discord.js";
import { config } from "../server/config.js";
import { payloadTooLarge, unprocessable } from "../server/errors.js";
import type { PdfUpload } from "../server/validation.js";

const DOWNLOAD_TIMEOUT_MS = 20_000;

export async function downloadAttachment(
  attachment: Attachment
): Promise<PdfUpload> {
  if (attachment.size > config.maxPdfBytes) {
    throw payloadTooLarge("O PDF excede o limite de 12 MB do Arquivo Tormenta.");
  }

  let response: Response;
  try {
    response = await fetch(attachment.url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
    });
  } catch {
    throw unprocessable(
      "DISCORD_DOWNLOAD_FAILED",
      "Não foi possível baixar o anexo enviado pelo Discord. Tente novamente."
    );
  }

  if (!response.ok) {
    throw unprocessable(
      "DISCORD_DOWNLOAD_FAILED",
      "O Discord não disponibilizou o anexo para processamento. Tente enviá-lo novamente."
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    size: buffer.length,
    buffer,
    originalname: attachment.name,
    mimetype: attachment.contentType ?? "application/octet-stream"
  };
}
