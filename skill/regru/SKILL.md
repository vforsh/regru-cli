---
name: regru
description: Use the regru CLI for REG.RU API2 domain and DNS automation (non-reseller). Use for listing domains/services, checking API auth, reading/updating DNS zones, and executing allowed API methods.
---

# regru

## Quick start

```bash
regru cfg set username yaforsh
printf 'your-password' | regru cfg set password -
regru doctor
```

## Common examples

```bash
regru nop
regru domains list
regru services list --servtype=domain
regru zone records example.ru
regru zone add txt example.ru subdomain=_acme-challenge text='token' ttl=300
regru do service/get_list servtype=domain
```

## Commands

- `cfg|config list|ls|path|get|set|unset|import|export`: manage config and credentials.
- `doctor|check`: validate runtime, config, auth presence, endpoint reachability.
- `skill`: print skill install URL.
- `nop`: run authenticated connectivity check.
- `services list`: list account services.
- `domains list`: list only domain services.
- `zone records`: read DNS records.
- `zone add|remove|update|clear`: write DNS zone data.
- `do|run|gen`: execute non-reseller API methods.

## Global flags

- `--json`: structured JSON output
- `--plain`: stable plain output
- `-q, --quiet`: reduce stderr noise
- `-v, --verbose`: verbose diagnostics
- `--timeout <ms>`
- `--retries <count>`
- `--endpoint <url>`
- `--region <name>`

## Common errors

- Exit `1`: API/network/config runtime failure.
- Exit `2`: invalid CLI usage or blocked reseller method.
- `RESELLER_*` methods are intentionally unsupported.
