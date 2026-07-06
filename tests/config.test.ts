import { describe, it, expect } from "vitest";
import { resolveConfig, type Env } from "../src/config";

const baseEnv = {
  WEBSPEED_SITE_TOKEN: "  tok  ",
  WEBSPEED_VERIFY_TOKEN: "vt",
  WEBSPEED_KV: {} as unknown,
} as unknown as Env;

describe("resolveConfig", () => {
  it("trims the token, defaults the API base, and derives the domain from the request", () => {
    const cfg = resolveConfig(baseEnv, new Request("https://Shop.Example.com/page"));
    expect(cfg.siteToken).toBe("tok");
    expect(cfg.apiBase).toBe("https://api.getwebspeed.io");
    expect(cfg.domain).toBe("shop.example.com");
  });
  it("strips a trailing slash from an API base override", () => {
    const cfg = resolveConfig({ ...baseEnv, WEBSPEED_API_BASE: "https://staging.test/" });
    expect(cfg.apiBase).toBe("https://staging.test");
  });
  it("prefers an explicit domain over the request host", () => {
    const cfg = resolveConfig(
      { ...baseEnv, WEBSPEED_SITE_DOMAIN: "Example.com" },
      new Request("https://cdn.other.net/x"),
    );
    expect(cfg.domain).toBe("example.com");
  });
  it("returns a null domain when neither is available", () => {
    expect(resolveConfig(baseEnv).domain).toBe(null);
  });
});
