import { Command } from "commander";
import { callRegRuApi, ensureSuccessResponse } from "../../lib/api.ts";
import { resolveEffectiveConfig } from "../../lib/config.ts";
import { CliError } from "../../lib/errors.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { parseAssignments } from "../../lib/params.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";

export function createDoCommand(): Command {
  return new Command("do")
    .alias("run")
    .alias("gen")
    .description("Execute any non-reseller REG.RU API2 method")
    .argument("<method>", "API method like service/get_list")
    .argument("[params...]", "key=value pairs")
    .option("-p, --param <key=value>", "extra parameter", (value, acc: string[]) => {
      acc.push(value);
      return acc;
    }, [] as string[])
    .action(async function action(method: string, params: string[], local: { param: string[] }) {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const allParams = parseAssignments(params, local.param);
      const payload = await callRegRuApi({ method, params: allParams, config });
      ensureSuccessResponse(payload);

      if (opts.json) {
        writeJson(payload);
        return;
      }
      if (opts.plain) {
        writePlain(JSON.stringify(payload));
        return;
      }
      writeHuman(JSON.stringify(payload, null, 2));
    });
}

function unsupportedAsyncCommand(name: "result" | "wait"): Command {
  return new Command(name)
    .description("Not supported: REG.RU API2 methods in this CLI are synchronous")
    .argument("<id>", "placeholder id")
    .action(() => {
      throw new CliError(`${name} is not supported: REG.RU API2 commands used by regru-cli are synchronous.`, 2);
    });
}

export const createResultCommand = (): Command => unsupportedAsyncCommand("result");
export const createWaitCommand = (): Command => unsupportedAsyncCommand("wait");
