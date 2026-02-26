import pc from "picocolors";
import type { GlobalOptions } from "./options.ts";

export function writeJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export function writePlain(lines: string[] | string): void {
  if (Array.isArray(lines)) {
    process.stdout.write(`${lines.join("\n")}\n`);
    return;
  }
  process.stdout.write(`${lines}\n`);
}

export function writeHuman(text: string): void {
  process.stdout.write(`${text}\n`);
}

export function logInfo(options: GlobalOptions, message: string): void {
  if (options.quiet) {
    return;
  }
  process.stderr.write(`${message}\n`);
}

export function logVerbose(options: GlobalOptions, message: string): void {
  if (!options.verbose || options.quiet) {
    return;
  }
  process.stderr.write(`${pc.dim(message)}\n`);
}
