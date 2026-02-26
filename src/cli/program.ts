import { Command } from "commander";
import { CLI_NAME, CLI_VERSION, DEFAULT_ENDPOINT, DEFAULT_RETRIES, DEFAULT_TIMEOUT_MS } from "../lib/constants.ts";
import { parseIntStrict } from "../lib/options.ts";
import { createConfigCommand } from "./commands/config.ts";
import { createDoctorCommand } from "./commands/doctor.ts";
import { createSkillCommand } from "./commands/skill.ts";
import { createNopCommand } from "./commands/nop.ts";
import { createServicesCommand } from "./commands/services.ts";
import { createDomainsCommand } from "./commands/domains.ts";
import { createZoneCommand } from "./commands/zone.ts";
import { createDoCommand, createResultCommand, createWaitCommand } from "./commands/do.ts";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name(CLI_NAME)
    .description("REG.RU API2 CLI (non-reseller)")
    .version(CLI_VERSION)
    .showHelpAfterError()
    .option("--json", "JSON output")
    .option("--plain", "Stable plain output")
    .option("-q, --quiet", "Suppress non-essential logs")
    .option("-v, --verbose", "Verbose logs to stderr")
    .option("--timeout <ms>", "Request timeout in milliseconds", (value) => parseIntStrict(value, "--timeout"), DEFAULT_TIMEOUT_MS)
    .option("--retries <count>", "Retry count for API calls", (value) => parseIntStrict(value, "--retries"), DEFAULT_RETRIES)
    .option("--endpoint <url>", `Override API endpoint (default: ${DEFAULT_ENDPOINT})`)
    .option("--region <name>", "Optional region label for future usage");

  program.addCommand(createConfigCommand());
  program.addCommand(createDoctorCommand());
  program.addCommand(createSkillCommand());

  program.addCommand(createNopCommand());
  program.addCommand(createServicesCommand());
  program.addCommand(createDomainsCommand());
  program.addCommand(createZoneCommand());
  program.addCommand(createDoCommand());
  program.addCommand(createResultCommand());
  program.addCommand(createWaitCommand());

  return program;
}
