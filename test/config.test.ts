import { describe, expect, test } from "bun:test";
import { assertNonResellerMethod } from "../src/lib/api.ts";
import { getConfigPath, isSecretKey } from "../src/lib/config.ts";
import { parseAssignments } from "../src/lib/params.ts";

describe("config path resolution", () => {
  test("respects XDG_CONFIG_HOME", () => {
    const original = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = "/tmp/xdg-home";

    const path = getConfigPath("regru");
    expect(path).toBe("/tmp/xdg-home/regru/config.json");

    if (original === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = original;
    }
  });
});

describe("method guard", () => {
  test("blocks reseller methods", () => {
    expect(() => assertNonResellerMethod("reseller_nop")).toThrow();
    expect(() => assertNonResellerMethod("user/set_reseller_url")).toThrow();
  });

  test("allows non-reseller methods", () => {
    expect(() => assertNonResellerMethod("service/get_list")).not.toThrow();
  });
});

describe("assignment parser", () => {
  test("parses key=value tokens", () => {
    const parsed = parseAssignments(["endpoint=https://api.reg.ru/api/regru2", "retries=2"]);
    expect(parsed.endpoint).toBe("https://api.reg.ru/api/regru2");
    expect(parsed.retries).toBe("2");
  });

  test("parses key value pair", () => {
    const parsed = parseAssignments(["username", "demo-user"]);
    expect(parsed.username).toBe("demo-user");
  });

  test("secret key detection", () => {
    expect(isSecretKey("password")).toBeTrue();
    expect(isSecretKey("endpoint")).toBeFalse();
  });
});
