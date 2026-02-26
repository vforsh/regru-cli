import { Command } from "commander";
import {
  getConfigPath,
  isMutableKey,
  isSecretKey,
  loadFileConfig,
  redactConfig,
  resolveEffectiveConfig,
  saveFileConfig,
  type FileConfig
} from "../../lib/config.ts";
import { CliError } from "../../lib/errors.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { parseAssignments } from "../../lib/params.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";
import { readStdin } from "../../lib/stdin.ts";

function parseTypedValue(key: keyof FileConfig, value: string): string | number {
  if (key === "timeout" || key === "retries") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      throw new CliError(`Invalid integer value for ${key}: ${value}`, 2);
    }
    return parsed;
  }
  return value;
}

async function readSecretFromStdin(): Promise<string> {
  const value = (await readStdin()).trim();
  if (!value) {
    throw new CliError("Expected secret value from stdin, got empty input.", 2);
  }
  return value;
}

function renderGetResult(asJson: boolean, asPlain: boolean, payload: Record<string, unknown>): void {
  if (asJson) {
    writeJson(payload);
    return;
  }

  if (asPlain) {
    const lines = Object.entries(payload).map(([key, value]) => `${key}\t${value ?? ""}`);
    writePlain(lines);
    return;
  }

  const lines = Object.entries(payload).map(([key, value]) => `${key}: ${value ?? "(unset)"}`);
  writeHuman(lines.join("\n"));
}

export function createConfigCommand(): Command {
  const config = new Command("config")
    .alias("cfg")
    .description("Manage regru-cli configuration")
    .addHelpText(
      "after",
      [
        "",
        "Examples:",
        "  regru cfg set endpoint=https://api.reg.ru/api/regru2 timeout=20000",
        "  printf \"my-pass\" | regru cfg set password -",
        "  regru cfg get endpoint region retries",
        "  regru cfg unset region retries",
        "  regru cfg import --json < config.json",
        "  regru cfg export --json"
      ].join("\n")
    );

  config
    .command("path")
    .description("Print config file path")
    .action(() => {
      writePlain(getConfigPath());
    });

  config
    .command("list")
    .alias("ls")
    .description("List effective config (env overrides file)")
    .action(async function action() {
      const opts = getGlobalOptions(this as Command);
      const effective = await resolveEffectiveConfig(opts);
      const data = redactConfig(effective);
      renderGetResult(opts.json, opts.plain, data);
    });

  config
    .command("get [keys...]")
    .description("Get one or more effective config keys")
    .option("--reveal", "show secret values")
    .action(async function action(keys: string[], localOptions: { reveal?: boolean }) {
      const opts = getGlobalOptions(this as Command);
      const effective = await resolveEffectiveConfig(opts);

      const selectedKeys = keys.length > 0 ? keys : Object.keys(effective);
      const data: Record<string, unknown> = {};
      for (const key of selectedKeys) {
        if (!(key in effective)) {
          data[key] = null;
          continue;
        }
        const value = (effective as unknown as Record<string, unknown>)[key];
        if (!localOptions.reveal && isSecretKey(key) && typeof value === "string" && value.length > 0) {
          data[key] = "********";
          continue;
        }
        data[key] = value;
      }

      renderGetResult(opts.json, opts.plain, data);
    });

  config
    .command("set [entries...]")
    .description("Set config values. Use key=value entries or <key> <value>")
    .option("--stdin-key <key>", "read value for key from stdin (secret-safe)")
    .action(async function action(entries: string[], localOptions: { stdinKey?: string }) {
      const parsed = parseAssignments(entries);

      if (localOptions.stdinKey) {
        parsed[localOptions.stdinKey] = "-";
      }

      if (Object.keys(parsed).length === 0) {
        throw new CliError("No key/value entries provided.", 2);
      }

      const file = await loadFileConfig();
      let stdinSecretCache: string | null = null;

      for (const [keyRaw, valueRaw] of Object.entries(parsed)) {
        if (!isMutableKey(keyRaw)) {
          throw new CliError(`Unsupported config key: ${keyRaw}`, 2);
        }

        const key = keyRaw as keyof FileConfig;
        let value = valueRaw;

        if (isSecretKey(keyRaw)) {
          if (value !== "-") {
            throw new CliError(`Refusing to set secret key '${keyRaw}' via argv. Use stdin: printf \"...\" | regru cfg set ${keyRaw} -`, 2);
          }
          if (stdinSecretCache === null) {
            stdinSecretCache = await readSecretFromStdin();
          }
          value = stdinSecretCache;
        } else if (value === "-") {
          value = (await readStdin()).trim();
        }

        if (!value) {
          throw new CliError(`Empty value for key '${keyRaw}' is not allowed. Use unset to remove keys.`, 2);
        }

        (file as Record<string, unknown>)[key] = parseTypedValue(key, value);
      }

      await saveFileConfig(file);
      writeHuman("Config updated.");
    });

  config
    .command("unset <keys...>")
    .description("Unset one or more file config keys")
    .action(async function action(keys: string[]) {
      const file = await loadFileConfig();
      for (const key of keys) {
        if (!isMutableKey(key)) {
          throw new CliError(`Unsupported config key: ${key}`, 2);
        }
        delete (file as Record<string, unknown>)[key];
      }
      await saveFileConfig(file);
      writeHuman("Config updated.");
    });

  config
    .command("import")
    .description("Import file config JSON from stdin (requires --json)")
    .action(async function action() {
      const opts = getGlobalOptions(this as Command);
      if (!opts.json) {
        throw new CliError("Use --json with cfg import and pipe JSON payload via stdin.", 2);
      }

      const raw = (await readStdin()).trim();
      if (!raw) {
        throw new CliError("No JSON payload provided on stdin.", 2);
      }

      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new CliError("Invalid JSON payload for cfg import.", 2);
      }

      const parsed = payload as Record<string, unknown>;
      const file: FileConfig = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (!isMutableKey(key)) {
          throw new CliError(`Unsupported key in import payload: ${key}`, 2);
        }
        if (typeof value === "string") {
          (file as Record<string, unknown>)[key] = parseTypedValue(key, value);
          continue;
        }
        (file as Record<string, unknown>)[key] = value;
      }

      await saveFileConfig(file);
      writeJson({ ok: true, path: getConfigPath() });
    });

  config
    .command("export")
    .description("Export effective config as JSON (requires --json)")
    .action(async function action() {
      const opts = getGlobalOptions(this as Command);
      if (!opts.json) {
        throw new CliError("Use --json with cfg export.", 2);
      }
      const effective = await resolveEffectiveConfig(opts);
      writeJson(effective);
    });

  return config;
}
