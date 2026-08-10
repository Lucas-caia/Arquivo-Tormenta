import { loadClamavConfig } from "../config.js";
import { pingClamav } from "./clamdClient.js";

function loadLocalEnv() {
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

loadLocalEnv();
const config = loadClamavConfig();

try {
  await pingClamav(config);
  console.log(`ClamAV disponível em ${config.host}:${config.port}.`);
} catch (error) {
  console.error("ClamAV indisponível:", error);
  process.exitCode = 1;
}
