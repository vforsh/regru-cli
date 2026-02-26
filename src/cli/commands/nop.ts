import { Command } from "commander";
import { callRegRuApi, ensureSuccessResponse } from "../../lib/api.ts";
import { resolveEffectiveConfig } from "../../lib/config.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";

export function createNopCommand(): Command {
  return new Command("nop").description("Run api/regru2/nop with current credentials").action(async function action() {
    const opts = getGlobalOptions(this as Command);
    const config = await resolveEffectiveConfig(opts);
    const payload = await callRegRuApi({ method: "nop", config });
    ensureSuccessResponse(payload);

    if (opts.json) {
      writeJson(payload);
      return;
    }

    const answer = payload.answer as Record<string, unknown> | undefined;
    const login = typeof answer?.login === "string" ? answer.login : "";
    const userId = typeof answer?.user_id === "number" || typeof answer?.user_id === "string" ? String(answer.user_id) : "";

    if (opts.plain) {
      writePlain([`login\t${login}`, `user_id\t${userId}`]);
      return;
    }

    writeHuman(`API OK\nlogin: ${login}\nuser_id: ${userId}`);
  });
}
