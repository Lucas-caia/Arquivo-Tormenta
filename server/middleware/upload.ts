import multer from "multer";
import { config } from "../config.js";

export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxPdfBytes,
    files: 1,
    fields: 0
  }
}).single("pdf");
