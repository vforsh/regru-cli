# regru-cli

`regru-cli` is a Bun-based command line tool for REG.RU API2 focused on non-reseller workflows.

Official API docs: https://www.reg.ru/reseller/api2doc

## Install

```bash
cd ~/dev/regru-cli
bun install
bun link
regru --help
```

## Auth and config

Secrets are never accepted in argv flags.

```bash
regru cfg set username your-username
printf 'your-password' | regru cfg set password -
regru cfg set endpoint=https://api.reg.ru/api/regru2 timeout=20000 retries=1
```

Environment variables override config:

- `REGRU_USERNAME`
- `REGRU_PASSWORD`
- `REGRU_ENDPOINT`
- `REGRU_TIMEOUT`
- `REGRU_RETRIES`
- `REGRU_REGION`

## Quick examples

```bash
# Basic connectivity
regru nop

# List all services
regru services list

# List domains only
regru domains list

# Get zone records
regru zone records example.test

# Add DNS TXT record (non-reseller API)
regru zone add txt example.test subdomain=_acme-challenge text='token-value' ttl=300

# Generic call for any non-reseller endpoint
regru do service/get_list servtype=domain
```

## Commands

- `cfg|config` - config management (`list|ls|path|get|set|unset|import|export`)
- `doctor|check` - read-only readiness checks
- `skill` - prints skill install URL
- `nop` - authenticated no-op check
- `services list`
- `domains list`
- `zone records|add|remove|update|clear`
- `do|run|gen` - generic non-reseller method call
- `result`, `wait` - reserved; not supported for REG.RU synchronous API flow

## Output modes

- default: human output
- `--plain`: stable line-oriented output
- `--json`: single JSON object output

## Notes

- Reseller API methods are intentionally blocked in this CLI.
- Full config roundtrip:

```bash
regru cfg export --json > cfg.json
regru cfg import --json < cfg.json
```
