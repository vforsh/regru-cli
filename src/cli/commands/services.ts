import { Command } from "commander";
import { callRegRuApi, ensureSuccessResponse } from "../../lib/api.ts";
import { resolveEffectiveConfig } from "../../lib/config.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";

interface ServiceItem {
  service_id: number;
  dname: string;
  servtype: string;
  state: string;
  expiration_date: string;
}

function asServiceItems(payload: Record<string, unknown>): ServiceItem[] {
  const answer = payload.answer as Record<string, unknown> | undefined;
  const services = (answer?.services as unknown[]) || [];
  return services.filter((item): item is ServiceItem => typeof item === "object" && item !== null && "service_id" in item) as ServiceItem[];
}

export function createServicesCommand(): Command {
  const cmd = new Command("services").description("Service-related commands");

  cmd
    .command("list")
    .description("List account services")
    .option("--servtype <type>", "filter by service type")
    .option("--state <state>", "filter by state")
    .action(async function action(local: { servtype?: string; state?: string }) {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const params: Record<string, string> = {};
      if (local.servtype) {
        params.servtype = local.servtype;
      }
      if (local.state) {
        params.state = local.state;
      }

      const payload = await callRegRuApi({ method: "service/get_list", params, config });
      ensureSuccessResponse(payload);
      const rows = asServiceItems(payload);

      if (opts.json) {
        writeJson({ services: rows });
        return;
      }

      if (opts.plain) {
        writePlain(rows.map((row) => `${row.service_id}\t${row.servtype}\t${row.dname}\t${row.state}\t${row.expiration_date}`));
        return;
      }

      const lines = rows.map((row) => `${row.servtype.padEnd(14)} ${row.dname.padEnd(28)} state=${row.state} exp=${row.expiration_date} id=${row.service_id}`);
      writeHuman(lines.length ? lines.join("\n") : "No services found.");
    });

  return cmd;
}
