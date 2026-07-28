import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { AppError, badRequest, payloadTooLarge } from "../errors.js";

export const apiNotFound: RequestHandler = (request, response) => {
  response.status(404).json({
    erro: `Endpoint não encontrado: ${request.method} ${request.originalUrl}`,
    codigo: "API_NOT_FOUND"
  });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  let normalized = error;

  if (error instanceof multer.MulterError) {
    normalized = error.code === "LIMIT_FILE_SIZE"
      ? payloadTooLarge("O PDF excede o limite de 12 MB.")
      : badRequest("UPLOAD_ERROR", "Não foi possível receber o arquivo PDF.", [error.message]);
  }

  if (normalized instanceof SyntaxError && "body" in normalized) {
    normalized = badRequest("INVALID_JSON", "O corpo JSON da requisição é inválido.");
  }

  if (normalized instanceof AppError) {
    response.status(normalized.status).json({
      erro: normalized.message,
      codigo: normalized.code,
      detalhes: normalized.details.length ? normalized.details : undefined
    });
    return;
  }

  console.error("Erro não tratado:", normalized);
  response.status(500).json({
    erro: "Ocorreu um erro interno ao concluir a operação.",
    codigo: "INTERNAL_ERROR"
  });
};
