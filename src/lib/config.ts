import { dirname, join } from "node:path";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { z } from "zod";
import { DEFAULT_ENDPOINT, DEFAULT_RETRIES, DEFAULT_TIMEOUT_MS } from "./constants.ts";
import { CliError } from "./errors.ts";
import type { GlobalOptions } from "./options.ts";

const FileConfigSchema = z
  .object({
    endpoint: z.url().optional(),
    region: z.string().min(1).optional(),
    timeout: z.number().int().positive().max(120_000).optional(),
    retries: z.number().int().min(0).max(10).optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional()
  })
  .strict();

export type FileConfig = z.infer<typeof FileConfigSchema>;

export interface EffectiveConfig extends FileConfig {
  endpoint: string;
  timeout: number;
  retries: number;
}

const mutableKeys = ["endpoint", "region", "timeout", "retries", "username", "password"] as const;
export type MutableKey = (typeof mutableKeys)[number];

const secretKeys = new Set<string>(["password", "token", "secret", "apikey", "api_key", "sig"]);

export function isSecretKey(key: string): boolean {
  return secretKeys.has(key.toLowerCase());
}

export function isMutableKey(key: string): key is MutableKey {
  return mutableKeys.includes(key as MutableKey);
}

export function getConfigPath(commandName = "regru"): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(process.env.HOME || "~", ".config");
  return join(configHome, commandName, "config.json");
}

export async function canReadWritePath(pathname: string): Promise<boolean> {
  try {
    await access(pathname, fsConstants.R_OK | fsConstants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadFileConfig(configPath = getConfigPath()): Promise<FileConfig> {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsedJson = JSON.parse(raw) as unknown;
    return FileConfigSchema.parse(parsedJson);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    if (error instanceof z.ZodError) {
      throw new CliError(`Invalid config schema at ${configPath}. ${error.issues.map((x) => x.message).join("; ")}`, 1);
    }
    if (error instanceof SyntaxError) {
      throw new CliError(`Invalid JSON in config file: ${configPath}`, 1);
    }
    throw error;
  }
}

export async function saveFileConfig(config: FileConfig, configPath = getConfigPath()): Promise<void> {
  const validated = FileConfigSchema.parse(config);
  const folder = dirname(configPath);
  await mkdir(folder, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

function envNumber(name: string): number | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function fromEnv(): FileConfig {
  const fromEnvironment: FileConfig = {};

  if (process.env.REGRU_ENDPOINT) {
    fromEnvironment.endpoint = process.env.REGRU_ENDPOINT;
  }
  if (process.env.REGRU_REGION) {
    fromEnvironment.region = process.env.REGRU_REGION;
  }

  const timeout = envNumber("REGRU_TIMEOUT");
  if (timeout !== undefined) {
    fromEnvironment.timeout = timeout;
  }

  const retries = envNumber("REGRU_RETRIES");
  if (retries !== undefined) {
    fromEnvironment.retries = retries;
  }

  if (process.env.REGRU_USERNAME) {
    fromEnvironment.username = process.env.REGRU_USERNAME;
  }
  if (process.env.REGRU_PASSWORD) {
    fromEnvironment.password = process.env.REGRU_PASSWORD;
  }

  return fromEnvironment;
}

export async function resolveEffectiveConfig(options: GlobalOptions): Promise<EffectiveConfig> {
  const file = await loadFileConfig();
  const env = fromEnv();

  const merged: EffectiveConfig = {
    endpoint: DEFAULT_ENDPOINT,
    timeout: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
    ...file,
    ...env,
    ...(options.endpoint ? { endpoint: options.endpoint } : {}),
    ...(options.region ? { region: options.region } : {}),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options.retries !== undefined ? { retries: options.retries } : {})
  };

  if (!merged.endpoint) {
    throw new CliError("Endpoint is not configured.", 2);
  }

  return merged;
}

export function redactConfig<T extends object>(config: T): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  if (typeof clone.password === "string" && clone.password.length > 0) {
    clone.password = "********";
  }
  return clone;
}
