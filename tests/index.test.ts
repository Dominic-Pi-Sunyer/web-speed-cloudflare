import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "../src/index";
import type { Env } from "../src/config";

function ctx() {
  return { waitUntil: (_p: Promise<unknown>) => {}, passThroughOnException: () => {} } as any;
}

function env(extra: Record<string, unknown> = {}): Env {
  return {
    WEBSPEED_SITE_TOKEN: "tok",
    WEBSPEED_VERIFY_TOKEN: "secret-token",
    WEBSPEED_KV: { get: async () => null, put: async () => {} },
    ...extra,
  } as unknown as Env;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("worker.fetch", () => {
  it("serves the verification token at the well-known path", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/.well-known/webspeed-verify.txt"),
      env(),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("secret-token");
  });

  it("passes every other request straight through to the origin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("<html>origin</html>", { status: 200, headers: { "content-type": "text/html" } }),
      ),
    );
    const res = await worker.fetch(new Request("https://example.com/page"), env(), ctx());
    expect(await res.text()).toBe("<html>origin</html>");
  });
});
