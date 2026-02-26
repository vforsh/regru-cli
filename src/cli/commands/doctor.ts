import { Command } from "commander";
import pc from "picocolors";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname } from "node:path";
import { callRegRuApi } from "../../lib/api.ts";
import { getConfigPath, loadFileConfig, resolveEffectiveConfig } from "../../lib/config.ts";
import { CliError } from "../../lib/errors.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";

interface CheckResult {
  id: string;
  status: "OK" | "WARN" | "FAIL";
  message: string;
  hint?: string;
}

function printHuman(results: CheckResult[]): void {
  const lines = results.map((item) => {
    const status = item.status === "OK" ? pc.green("OK") : item.status === "WARN" ? pc.yellow("WARN") : pc.red("FAIL");
    const base = `${status} ${item.id}: ${item.message}`;
    return item.hint ? `${base} (${item.hint})` : base;
  });
  writeHuman(lines.join("\n"));
}

function computeExitCode(results: CheckResult[]): number {
  return results.some((item) => item.status === "FAIL") ? 1 : 0;
}

export function createDoctorCommand(): Command {
  return new Command("doctor")
    .alias("check")
    .description("Run read-only readiness checks")
    .action(async function action() {
      const opts = getGlobalOptions(this as Command);
      const results: CheckResult[] = [];

      results.push({
        id: "runtime.bun",
        status: process.versions.bun ? "OK" : "FAIL",
        message: process.versions.bun ? `Bun ${process.versions.bun}` : "Bun runtime not detected",
        hint: process.versions.bun ? undefined : "Install Bun"
      });

      const configPath = getConfigPath();
      const configDir = dirname(configPath);
      try {
        await access(configDir, fsConstants.R_OK | fsConstants.W_OK);
        results.push({ id: "fs.config_dir", status: "OK", message: `Config dir accessible: ${configDir}` });
      } catch {
        results.push({
          id: "fs.config_dir",
          status: "WARN",
          message: `Config dir not accessible yet: ${configDir}`,
          hint: "Run `regru cfg set endpoint=https://api.reg.ru/api/regru2` to create it"
        });
      }

      try {
        await loadFileConfig(configPath);
        results.push({ id: "config.parse", status: "OK", message: "Config file is valid or absent" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown config parse error";
        results.push({ id: "config.parse", status: "FAIL", message, hint: "Fix or remove broken config file" });
      }

      const effective = await resolveEffectiveConfig(opts);
      results.push({ id: "config.endpoint", status: "OK", message: `Endpoint: ${effective.endpoint}` });

      if (effective.username && effective.password) {
        results.push({ id: "auth.credentials", status: "OK", message: "Username/password present" });
      } else {
        results.push({
          id: "auth.credentials",
          status: "FAIL",
          message: "Username/password missing",
          hint: "Set REGRU_USERNAME/REGRU_PASSWORD or use regru cfg set"
        });
      }

      try {
        const probe = await callRegRuApi({
          method: "nop",
          requireAuth: false,
          params: { username: "test", password: "test" },
          config: { ...effective, timeout: Math.min(effective.timeout, 6_000), retries: 0 }
        });
        if (probe.result === "success") {
          results.push({ id: "network.endpoint", status: "OK", message: "Endpoint reachable" });
        } else {
          results.push({ id: "network.endpoint", status: "WARN", message: "Endpoint reachable but probe returned API error" });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Endpoint check failed";
        results.push({ id: "network.endpoint", status: "FAIL", message, hint: "Check endpoint/network/firewall" });
      }

      if (effective.username && effective.password) {
        try {
          const live = await callRegRuApi({
            method: "nop",
            config: { ...effective, timeout: Math.min(effective.timeout, 8_000), retries: 0 }
          });
          if (live.result === "success") {
            results.push({ id: "auth.live_nop", status: "OK", message: "Live auth call succeeded" });
          } else {
            results.push({ id: "auth.live_nop", status: "FAIL", message: "Live auth call returned API error" });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Live auth check failed";
          results.push({ id: "auth.live_nop", status: "FAIL", message, hint: "Verify API allowlist and credentials" });
        }
      }

      const overall = results.some((x) => x.status === "FAIL") ? "fail" : "ok";
      const exitCode = computeExitCode(results);

      if (opts.json) {
        writeJson({ status: overall, checks: results, exitCode });
      } else if (opts.plain) {
        writePlain(results.map((item) => `${item.id}\t${item.status}\t${item.message}`));
      } else {
        printHuman(results);
      }

      if (exitCode !== 0) {
        throw new CliError("Doctor found blocking issues.", exitCode);
      }
    });
}
