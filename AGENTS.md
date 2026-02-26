## General Rules

- **Bun-only workflow**: Use `bun install`, `bun run`, `bun test`. No npm/pnpm/yarn commands in docs, scripts, or examples.
- **Commander CLI patterns**: Keep command registration in `src/cli/program.ts`; each command lives in `src/cli/commands/*.ts`.
- **Keep files small**: Target under ~500 LOC per file. Split helpers into `src/lib/*` before adding deep branching.
- **Output contract**: Primary command output to stdout; logs/diagnostics to stderr. Preserve `--json` and `--plain` behavior for every new command.
- **No reseller scope**: This repo is non-reseller by design. Do not add `reseller_*` features or methods.
- **Secret handling**: Never pass secrets via argv. Use env (`REGRU_PASSWORD`) or stdin (`printf ... | regru cfg set password -`).

---

## Build / Test

- **Install deps**: `bun install`
- **Typecheck**: `bun run typecheck`
- **Tests**: `bun test`
- **CLI smoke**: `bun run cmd --help`
- **Linked binary check**: `regru --help` after `bun link`
- **Pre-handoff gate**: run `bun run typecheck && bun test`

---

## Critical Thinking

- **Fix root cause first**: Do not patch symptoms around API errors; inspect request params, auth, endpoint resolution.
- **Preserve contracts**: If changing config/output behavior, update tests + README + `skill/regru/SKILL.md` in the same change.
- **Low-risk debugging**: Prefer `regru doctor` and `regru --json ...` checks before editing core request flow.
- **Unknown changes**: If unrelated files changed unexpectedly during your work, stop and ask before proceeding.

---

## Git

- **Commit style**: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
- **Atomic changes**: Keep commits scoped (feature + tests + docs together).
- **No history rewriting**: Do not amend or rebase published commits unless explicitly requested.

---

## Repo Tour

- **Binary entry**: `bin/regru`
- **Process entry**: `src/index.ts` (error shaping, exit codes)
- **CLI wiring**: `src/cli/program.ts`
- **Commands**: `src/cli/commands/*`
- **Core libs**: `src/lib/api.ts`, `src/lib/config.ts`, `src/lib/output.ts`, `src/lib/params.ts`
- **Tests**: `test/*.test.ts`
- **User docs**: `README.md`
- **Agent-facing skill doc**: `skill/regru/SKILL.md`

---

## Debug Cookbook

- **Config path**: `regru cfg path`
- **Effective config**: `regru --json cfg list`
- **Health checks**: `regru doctor` or `regru --plain doctor`
- **Auth sanity**: `REGRU_USERNAME=... REGRU_PASSWORD=... regru --json nop`
- **Domain inventory**: `regru --json domains list`
- **API reachability only**: use `doctor` endpoint check before credential debugging

---

## Golden Paths

- **Add a new command**:
  - Create `src/cli/commands/<name>.ts`
  - Register in `src/cli/program.ts`
  - Reuse `resolveEffectiveConfig`, `callRegRuApi`, output helpers
  - Add tests in `test/*`
  - Update `README.md` and `skill/regru/SKILL.md`
- **Add a new API call option**:
  - Parse with `parseAssignments` or explicit commander options
  - Validate and fail with `CliError(..., 2)` for bad usage
  - Keep JSON error envelope unchanged in `src/index.ts`

---

## Contracts / Invariants

- **Reseller guard invariant**: `src/lib/api.ts` must keep blocking methods containing `reseller`.
- **Error JSON invariant**: In `--json` mode, errors print `{ \"error\": { \"message\", \"exitCode\", ... } }` to stdout.
- **Exit codes**: `0` success, `1` runtime/API failure, `2` invalid usage/blocked operation.
- **Config precedence**: CLI flags > env > config file defaults.
- **Secret policy**: Secret keys are never accepted directly as argv values.
