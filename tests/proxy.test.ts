import { describe, it, expect } from "vitest";
import { originRequest } from "../src/proxy";

describe("originRequest", () => {
  it("returns the same request when no origin is configured", () => {
    const r = new Request("https://front.workers.dev/page");
    expect(originRequest(r, undefined)).toBe(r);
  });

  it("rewrites host + protocol to the origin, keeping path and query", () => {
    const r = new Request("https://front.workers.dev/race?x=1");
    const out = originRequest(r, "https://origin.example.com");
    const u = new URL(out.url);
    expect(u.host).toBe("origin.example.com");
    expect(u.pathname).toBe("/race");
    expect(u.search).toBe("?x=1");
    expect(out.headers.get("host")).toBe(null);
  });

  it("falls back to the original request on a bad origin value", () => {
    const r = new Request("https://front.workers.dev/x");
    expect(originRequest(r, "not a url")).toBe(r);
  });
});
