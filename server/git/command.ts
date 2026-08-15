import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { AppError } from "../errors.js";

const exec = promisify(execFile);
const deployKeySource = path.resolve(
  process.env.GIT_DEPLOY_KEY_PATH || path.join(process.cwd(), ".secrets", "github_deploy_key")
);
const knownHostsPath = path.join(os.tmpdir(), "arquivo-tormenta-github-known-hosts");

// Chave pública de host Ed25519 publicada pelo GitHub em sua documentação oficial.
const githubKnownHost = "github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n";

export type GitCommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxBuffer?: number;
};

function errorText(error: unknown) {
  const candidate = error as { stderr?: string; stdout?: string; message?: string };
  return [candidate.stderr, candidate.stdout, candidate.message]
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function runGit(args: string[], options: GitCommandOptions = {}) {
  try {
    const result = await exec("git", args, {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      maxBuffer: options.maxBuffer ?? 4 * 1024 * 1024
    });
    return `${result.stdout}${result.stderr}`.trim();
  } catch (error) {
    const detail = errorText(error) || "O comando Git falhou sem detalhes adicionais.";
    throw new AppError(502, "GIT_COMMAND_FAILED", "Não foi possível concluir a operação Git.", [detail]);
  }
}

export async function isDeployKeyConfigured() {
  try {
    const stats = await fs.stat(deployKeySource);
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
}

function quoteShellPath(value: string) {
  return `"${value.replace(/"/g, "\\\"")}"`;
}

export async function withSshEnvironment<T>(operation: (env: NodeJS.ProcessEnv) => Promise<T>) {
  if (!(await isDeployKeyConfigured())) {
    throw new AppError(
      503,
      "GIT_SSH_KEY_MISSING",
      "A chave SSH do GitHub ainda não foi configurada.",
      ["Crie .secrets/github_deploy_key e adicione a chave pública como Deploy Key no repositório."]
    );
  }

  const temporaryKeyPath = path.join(
    os.tmpdir(),
    `arquivo-tormenta-git-key-${process.pid}-${Date.now()}`
  );

  try {
    const privateKey = await fs.readFile(deployKeySource);
    await fs.writeFile(temporaryKeyPath, privateKey, { mode: 0o600 });
    await fs.chmod(temporaryKeyPath, 0o600).catch(() => undefined);
    await fs.writeFile(knownHostsPath, githubKnownHost, { mode: 0o600 });

    const sshCommand = [
      "ssh",
      "-i", quoteShellPath(temporaryKeyPath),
      "-o", "IdentitiesOnly=yes",
      "-o", `UserKnownHostsFile=${quoteShellPath(knownHostsPath)}`,
      "-o", "StrictHostKeyChecking=yes",
      "-o", "HostKeyAlgorithms=ssh-ed25519"
    ].join(" ");

    return await operation({
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_SSH_COMMAND: sshCommand
    });
  } finally {
    await fs.rm(temporaryKeyPath, { force: true }).catch(() => undefined);
  }
}
