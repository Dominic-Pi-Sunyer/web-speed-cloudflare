import { describe, it, expect, vi, afterEach } from "vitest";
import { maybeCapture } from "../src/capture";
import type { Env } from "../src/config";

function makeKV() {
  const store = new Map<string, string>();
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => {
      store.set(k, v);
    },
  };
}

function env(kv: unknown, extra: Record<string, unknown> = {}): Env {
  return {
    WEBSPEED_SITE_TOKEN: "tok",
    WEBSPEED_VERIFY_TOKEN: "vt",
    WEBSPEED_SITE_DOMAIN: "example.com",
    WEBSPEED_KV: kv,
    ...extra,
  } as unknown as Env;
}

function htmlRes(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("maybeCapture", () => {
  it("pushes a public page once, dedups unchanged, re-pushes on change", async () => {
    const calls: { url: string; body: any }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: any, init: any) => {
        calls.push({ url: String(url), body: JSON.parse(init.body) });
        return new Response("{}", { status: 200 });
      }),
    );
    const e = env(makeKV());

    await maybeCapture(new Request("https://example.com/p"), htmlRes("<html>v1</html>"), e);
    expect(calls.length).toBe(1);
    expect(calls[0].url).toContain("/v1/plugin/ingest");
    expect(calls[0].body.url).toBe("https://example.com/p");
    expect(calls[0].body.rendered_html).toBe("<html>v1</html>");
    expect(calls[0].body.trigger).toBe("edge");

    // Same content → no second push.
    await maybeCapture(new Request("https://example.com/p"), htmlRes("<html>v1</html>"), e);
    expect(calls.length).toBe(1);

    // Changed content → pushes again.
    await maybeCapture(new Request("https://example.com/p"), htmlRes("<html>v2</html>"), e);
    expect(calls.length).toBe(2);
  });

  it("never pushes a logged-in view", async () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await maybeCapture(
      new Request("https://example.com/p", { headers: { cookie: "wordpress_logged_in_x=1" } }),
      htmlRes("<html>x</html>"),
      env(makeKV()),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing without a site token", async () => {
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await maybeCapture(
      new Request("https://example.com/p"),
      htmlRes("<html>x</html>"),
      env(makeKV(), { WEBSPEED_SITE_TOKEN: "" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
