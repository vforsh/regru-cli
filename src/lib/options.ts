import type { Command } from "commander";

export interface GlobalOptions {
  json: boolean;
  plain: boolean;
  quiet: boolean;
  verbose: boolean;
  timeout?: number;
  retries?: number;
  endpoint?: string;
  region?: string;
}

export function parseIntStrict(value: string, optionName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer for ${optionName}: ${value}`);
  }
  return parsed;
}

export function getGlobalOptions(command: Command): GlobalOptions {
  const raw = command.optsWithGlobals() as Record<string, unknown>;
  return {
    json: Boolean(raw.json),
    plain: Boolean(raw.plain),
    quiet: Boolean(raw.quiet),
    verbose: Boolean(raw.verbose),
    timeout: typeof raw.timeout === "number" ? raw.timeout : undefined,
    retries: typeof raw.retries === "number" ? raw.retries : undefined,
    endpoint: typeof raw.endpoint === "string" ? raw.endpoint : undefined,
    region: typeof raw.region === "string" ? raw.region : undefined
  };
}

export function detectJsonMode(argv: string[]): boolean {
  return argv.includes("--json");
}
