export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: string[];

  constructor(status: number, code: string, message: string, details: string[] = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code: string, message: string, details: string[] = []) {
  return new AppError(400, code, message, details);
}

export function notFound(code: string, message: string) {
  return new AppError(404, code, message);
}

export function conflict(code: string, message: string, details: string[] = []) {
  return new AppError(409, code, message, details);
}

export function payloadTooLarge(message: string) {
  return new AppError(413, "PDF_TOO_LARGE", message);
}

export function unsupportedMedia(message: string) {
  return new AppError(415, "INVALID_PDF_TYPE", message);
}

export function unprocessable(code: string, message: string, details: string[] = []) {
  return new AppError(422, code, message, details);
}
