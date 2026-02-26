import { Command } from "commander";
import { callRegRuApi, ensureSuccessResponse } from "../../lib/api.ts";
import { resolveEffectiveConfig } from "../../lib/config.ts";
import { CliError } from "../../lib/errors.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { parseAssignments } from "../../lib/params.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";

const allowedKinds = new Set(["alias", "aaaa", "cname", "txt", "mx", "ns", "srv", "caa", "https"]);

function writePayload(payload: Record<string, unknown>, opts: { json: boolean; plain: boolean }): void {
  if (opts.json) {
    writeJson(payload);
    return;
  }
  if (opts.plain) {
    const result = typeof payload.result === "string" ? payload.result : "unknown";
    const code = typeof payload.error_code === "string" ? payload.error_code : "-";
    writePlain(`${result}\t${code}`);
    return;
  }
  writeHuman(JSON.stringify(payload, null, 2));
}

export function createZoneCommand(): Command {
  const zone = new Command("zone").description("Zone (DNS) operations");

  zone
    .command("records <domain>")
    .description("Get DNS records for a domain")
    .action(async function action(domain: string) {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const payload = await callRegRuApi({
        method: "zone/get_resource_records",
        config,
        params: { domain_name: domain }
      });
      ensureSuccessResponse(payload);

      if (opts.json) {
        writeJson(payload);
        return;
      }
      if (opts.plain) {
        const records = ((payload.answer as Record<string, unknown>)?.rrs as unknown[]) || [];
        const lines = records.map((record) => JSON.stringify(record));
        writePlain(lines.length ? lines : "");
        return;
      }

      writeHuman(JSON.stringify(payload, null, 2));
    });

  zone
    .command("add <kind> <domain> [params...]")
    .description("Add DNS record using zone/add_<kind> (kind: alias, aaaa, cname, txt, mx, ns, srv, caa, https)")
    .option("-p, --param <key=value>", "extra parameter", (value, acc: string[]) => {
      acc.push(value);
      return acc;
    }, [] as string[])
    .action(async function action(kind: string, domain: string, params: string[], local: { param: string[] }) {
      const normalizedKind = kind.toLowerCase();
      if (!allowedKinds.has(normalizedKind)) {
        throw new CliError(`Unsupported record kind: ${kind}`, 2);
      }
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const extra = parseAssignments(params, local.param);
      const payload = await callRegRuApi({
        method: `zone/add_${normalizedKind}`,
        config,
        params: { domain_name: domain, ...extra }
      });
      ensureSuccessResponse(payload);
      writePayload(payload, opts);
    });

  zone
    .command("remove <domain> [params...]")
    .description("Remove DNS record using zone/remove_record")
    .option("-p, --param <key=value>", "extra parameter", (value, acc: string[]) => {
      acc.push(value);
      return acc;
    }, [] as string[])
    .action(async function action(domain: string, params: string[], local: { param: string[] }) {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const extra = parseAssignments(params, local.param);
      const payload = await callRegRuApi({
        method: "zone/remove_record",
        config,
        params: { domain_name: domain, ...extra }
      });
      ensureSuccessResponse(payload);
      writePayload(payload, opts);
    });

  zone
    .command("update <domain> [params...]")
    .description("Update zone records using zone/update_records")
    .option("-p, --param <key=value>", "extra parameter", (value, acc: string[]) => {
      acc.push(value);
      return acc;
    }, [] as string[])
    .action(async function action(domain: string, params: string[], local: { param: string[] }) {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const extra = parseAssignments(params, local.param);
      const payload = await callRegRuApi({
        method: "zone/update_records",
        config,
        params: { domain_name: domain, ...extra }
      });
      ensureSuccessResponse(payload);
      writePayload(payload, opts);
    });

  zone
    .command("clear <domain>")
    .description("Clear zone records using zone/clear")
    .action(async function action(domain: string) {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const payload = await callRegRuApi({ method: "zone/clear", config, params: { domain_name: domain } });
      ensureSuccessResponse(payload);
      writePayload(payload, opts);
    });

  return zone;
}
