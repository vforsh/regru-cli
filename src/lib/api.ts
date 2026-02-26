import { CliError } from "./errors.ts";
import type { EffectiveConfig } from "./config.ts";

function normalizeMethod(method: string): string {
  return method.replace(/^\/+/, "").trim();
}

export function assertNonResellerMethod(method: string): void {
  const normalized = normalizeMethod(method).toLowerCase();
  if (normalized.includes("reseller")) {
    throw new CliError("Reseller methods are intentionally not supported by regru-cli.", 2);
  }
}

export interface ApiCallOptions {
  method: string;
  params?: Record<string, string>;
  config: EffectiveConfig;
  requireAuth?: boolean;
}

export async function callRegRuApi(options: ApiCallOptions): Promise<Record<string, unknown>> {
  const method = normalizeMethod(options.method);
  assertNonResellerMethod(method);

  const params = new URLSearchParams();
  const allParams = options.params || {};

  for (const [key, value] of Object.entries(allParams)) {
    params.set(key, value);
  }

  params.set("output_format", "json");

  const requireAuth = options.requireAuth !== false;
  if (requireAuth) {
    if (!options.config.username || !options.config.password) {
      throw new CliError(
        "Username/password are missing. Set via `regru cfg set username <value>` and `printf \"...\" | regru cfg set password -`, or env REGRU_USERNAME/REGRU_PASSWORD.",
        2
      );
    }
    params.set("username", options.config.username);
    params.set("password", options.config.password);
  }

  const url = `${options.config.endpoint.replace(/\/$/, "")}/${method}`;
  const maxAttempts = Math.max(1, options.config.retries + 1);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), options.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: params,
        signal: controller.signal
      });

      clearTimeout(timeoutHandle);

      const raw = await response.text();
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new CliError(`Unexpected non-JSON response from API (${response.status}).`, 1, { raw });
      }

      if (!response.ok) {
        throw new CliError(`HTTP ${response.status} from API.`, 1, payload);
      }

      return payload;
    } catch (error) {
      clearTimeout(timeoutHandle);
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      await Bun.sleep(150 * attempt);
    }
  }

  if (lastError instanceof CliError) {
    throw lastError;
  }
  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new CliError(`Request timed out after ${options.config.timeout}ms.`, 1);
  }
  throw new CliError(lastError instanceof Error ? lastError.message : "API request failed.", 1);
}

export function ensureSuccessResponse(payload: Record<string, unknown>): void {
  const result = payload.result;
  if (result === "success") {
    return;
  }

  const errorCode = typeof payload.error_code === "string" ? payload.error_code : "API_ERROR";
  const errorText = typeof payload.error_text === "string" ? payload.error_text : "REG.RU API returned an error.";
  throw new CliError(`${errorCode}: ${errorText}`, 1, payload);
}
