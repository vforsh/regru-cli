import { Command } from "commander";
import { callRegRuApi, ensureSuccessResponse } from "../../lib/api.ts";
import { resolveEffectiveConfig } from "../../lib/config.ts";
import { getGlobalOptions } from "../../lib/options.ts";
import { writeHuman, writeJson, writePlain } from "../../lib/output.ts";

interface DomainService {
  service_id: number;
  dname: string;
  servtype: string;
  state: string;
  expiration_date: string;
}

function domainRows(payload: Record<string, unknown>): DomainService[] {
  const answer = payload.answer as Record<string, unknown> | undefined;
  const services = (answer?.services as unknown[]) || [];
  return services
    .filter((item): item is DomainService => typeof item === "object" && item !== null && "servtype" in item)
    .filter((item) => item.servtype === "domain");
}

export function createDomainsCommand(): Command {
  const cmd = new Command("domains").description("Domain commands");

  cmd
    .command("list")
    .description("List domains in the account")
    .action(async function action() {
      const opts = getGlobalOptions(this as Command);
      const config = await resolveEffectiveConfig(opts);
      const payload = await callRegRuApi({ method: "service/get_list", params: { servtype: "domain" }, config });
      ensureSuccessResponse(payload);

      const rows = domainRows(payload);
      if (opts.json) {
        writeJson({ domains: rows });
        return;
      }

      if (opts.plain) {
        writePlain(rows.map((row) => `${row.dname}\t${row.expiration_date}\t${row.service_id}\t${row.state}`));
        return;
      }

      const lines = rows.map((row) => `${row.dname.padEnd(24)} exp=${row.expiration_date} state=${row.state} id=${row.service_id}`);
      writeHuman(lines.length ? lines.join("\n") : "No domains found.");
    });

  return cmd;
}
