import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const managedPaths = ["data/fichas", "data/revisoes"];

async function runGit(args: string[]) {
  const result = await exec("git", args, {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024
  });
  return `${result.stdout}${result.stderr}`.trim();
}

async function statusFiles() {
  const output = await runGit(["status", "--porcelain"]);
  return output.split("\n").map((line) => line.trim()).filter(Boolean);
}

async function hasStagedChanges() {
  try {
    await runGit(["diff", "--cached", "--quiet", "--", ...managedPaths]);
    return false;
  } catch (error) {
    const exitCode = (error as { code?: number }).code;
    if (exitCode === 1) return true;
    throw error;
  }
}

export async function getGitStatus() {
  try {
    const branch = await runGit(["branch", "--show-current"]).catch(() => "main");
    const alterados = await statusFiles();
    return {
      conectado: true,
      branch: branch || "main",
      alterados,
      mensagem: alterados.length ? `${alterados.length} alteração(ões) local(is)` : "Nenhuma alteração local",
      atualizadoEm: new Date().toISOString()
    };
  } catch (error) {
    return {
      conectado: false,
      branch: "",
      alterados: [],
      mensagem: error instanceof Error ? error.message : "Git indisponível",
      atualizadoEm: new Date().toISOString()
    };
  }
}

export async function pullRepository() {
  try {
    const detalhes = await runGit(["pull", "--ff-only"]);
    return {
      sucesso: true,
      mensagem: "Pull concluído com sucesso.",
      detalhes,
      status: await getGitStatus()
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: "Não foi possível puxar alterações do GitHub.",
      detalhes: error instanceof Error ? error.message : String(error),
      status: await getGitStatus()
    };
  }
}

export async function pushRepository() {
  try {
    await runGit(["add", "--", ...managedPaths]);
    if (!(await hasStagedChanges())) {
      return {
        sucesso: true,
        mensagem: "Não há alterações de fichas para enviar.",
        detalhes: "Nenhuma mudança preparada em data/fichas ou data/revisoes.",
        status: await getGitStatus()
      };
    }

    const stamp = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date());
    await runGit(["commit", "-m", `Atualiza fichas RPG - ${stamp}`]);
    const detalhes = await runGit(["push"]);
    return {
      sucesso: true,
      mensagem: "Push concluído com sucesso.",
      detalhes,
      status: await getGitStatus()
    };
  } catch (error) {
    return {
      sucesso: false,
      mensagem: "Não foi possível enviar alterações para o GitHub.",
      detalhes: error instanceof Error ? error.message : String(error),
      status: await getGitStatus()
    };
  }
}
