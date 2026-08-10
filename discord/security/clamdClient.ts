import net from "node:net";
import { AppError } from "../../server/errors.js";
import type { ClamavConfig } from "../config.js";

const CHUNK_SIZE = 64 * 1024;

export type ClamavScanResult =
  | { status: "clean" }
  | { status: "infected"; signature: string };

function clamavUnavailable(message: string, details: string[] = []) {
  return new AppError(503, "CLAMAV_UNAVAILABLE", message, details);
}

function command(
  payload: Buffer,
  config: ClamavConfig
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: config.host, port: config.port });
    const chunks: Buffer[] = [];
    let settled = false;

    function finishWithError(error: Error) {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error);
    }

    function finishWithReply(reply: string) {
      if (settled) return;
      settled = true;
      socket.end();
      resolve(reply);
    }

    socket.setTimeout(config.timeoutMs);

    socket.once("connect", () => {
      socket.write(payload);
    });

    socket.on("data", (chunk) => {
      chunks.push(chunk);
      const response = Buffer.concat(chunks);
      const terminatorIndex = response.indexOf(0);
      if (terminatorIndex >= 0) {
        finishWithReply(response.subarray(0, terminatorIndex).toString("utf8").trim());
      }
    });

    socket.once("timeout", () => {
      finishWithError(
        clamavUnavailable("O ClamAV não respondeu dentro do tempo esperado.")
      );
    });

    socket.once("error", (error) => {
      finishWithError(
        clamavUnavailable("Não foi possível conectar ao serviço ClamAV.", [
          error.message
        ])
      );
    });

    socket.once("end", () => {
      if (settled) return;
      const reply = Buffer.concat(chunks).toString("utf8").replace(/\0/g, "").trim();
      if (reply) finishWithReply(reply);
      else finishWithError(clamavUnavailable("O ClamAV encerrou a conexão sem responder."));
    });
  });
}

export function parseClamdScanReply(reply: string): ClamavScanResult {
  if (reply === "stream: OK") return { status: "clean" };

  const infected = /^stream: (.+) FOUND$/.exec(reply);
  if (infected) {
    return { status: "infected", signature: infected[1] };
  }

  throw clamavUnavailable("O ClamAV não conseguiu concluir a verificação.", [reply]);
}

export async function pingClamav(config: ClamavConfig) {
  const reply = await command(Buffer.from("zPING\0", "utf8"), config);
  if (reply !== "PONG") {
    throw clamavUnavailable("O ClamAV respondeu de forma inesperada.", [reply]);
  }
  return true;
}

export async function scanBufferWithClamav(
  buffer: Buffer,
  config: ClamavConfig
): Promise<ClamavScanResult> {
  const payloadParts: Buffer[] = [Buffer.from("zINSTREAM\0", "utf8")];

  for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
    const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(chunk.length, 0);
    payloadParts.push(length, chunk);
  }

  payloadParts.push(Buffer.alloc(4));
  const reply = await command(Buffer.concat(payloadParts), config);
  return parseClamdScanReply(reply);
}
