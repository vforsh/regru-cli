import { Command } from "commander";
import { SKILL_URL } from "../../lib/constants.ts";
import { writePlain } from "../../lib/output.ts";

export function createSkillCommand(): Command {
  return new Command("skill")
    .description("Print skill install URL")
    .action(() => {
      writePlain(SKILL_URL);
    });
}
