import { CliError } from "./errors.ts";

export function parseAssignments(tokens: string[], repeatedParams: string[] = []): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const entry of repeatedParams) {
    const [key, ...rest] = entry.split("=");
    if (!key || rest.length === 0) {
      throw new CliError(`Invalid --param value: ${entry}. Expected key=value.`, 2);
    }
    parsed[key] = rest.join("=");
  }

  if (tokens.length === 2 && !tokens[0]?.includes("=") && !tokens[1]?.includes("=")) {
    const [key, value] = tokens;
    if (!key || value === undefined) {
      throw new CliError("Expected <key> <value> pair.", 2);
    }
    parsed[key] = value;
    return parsed;
  }

  for (const token of tokens) {
    const [key, ...rest] = token.split("=");
    if (!key || rest.length === 0) {
      throw new CliError(`Invalid argument: ${token}. Expected key=value.`, 2);
    }
    parsed[key] = rest.join("=");
  }

  return parsed;
}
