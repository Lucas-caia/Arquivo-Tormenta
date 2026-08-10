export const config = {
  port: Number(process.env.PORT || 3333),
  maxPdfBytes: 12 * 1024 * 1024,
  jsonBodyLimit: "2mb"
} as const;
