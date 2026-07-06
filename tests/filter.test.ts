import { describe, it, expect } from "vitest";
import { isCapturable } from "../src/filter";
import type { WebSpeedConfig } from "../src/config";

const cfg: WebSpeedConfig = {
  siteToken: "tok",
  verifyToken: "vt",
  apiBase: "https://api.getwebspeed.io",
  domain: "example.com",
};

function res(
  status = 200,
  headers: Record<string, string> = { "content-type": "text/html" },
): Response {
  return new Response("<html></html>", { status, headers });
}
function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("isCapturable", () => {
  it("accepts a plain public HTML GET", () => {
    expect(isCapturable(req("https://example.com/about"), res(), cfg)).toBe(true);
  });
  it("treats www as the same domain", () => {
    expect(isCapturable(req("https://www.example.com/about"), res(), cfg)).toBe(true);
  });
  it("rejects non-GET", () => {
    const r = new Request("https://example.com/x", { method: "POST" });
    expect(isCapturable(r, res(), cfg)).toBe(false);
  });
  it("rejects non-200", () => {
    expect(isCapturable(req("https://example.com/x"), res(404), cfg)).toBe(false);
  });
  it("rejects non-HTML", () => {
    expect(
      isCapturable(req("https://example.com/x"), res(200, { "content-type": "application/json" }), cfg),
    ).toBe(false);
  });
  it("rejects Cache-Control: private", () => {
    expect(
      isCapturable(req("https://example.com/x"), res(200, { "content-type": "text/html", "cache-control": "private" }), cfg),
    ).toBe(false);
  });
  it("rejects Vary: Cookie", () => {
    expect(
      isCapturable(req("https://example.com/x"), res(200, { "content-type": "text/html", vary: "Cookie" }), cfg),
    ).toBe(false);
  });
  it("rejects a logged-in session cookie", () => {
    expect(
      isCapturable(req("https://example.com/x", { cookie: "wordpress_logged_in_abc=1" }), res(), cfg),
    ).toBe(false);
  });
  it("rejects a different domain", () => {
    expect(isCapturable(req("https://evil.com/x"), res(), cfg)).toBe(false);
  });
  it("rejects query-string URLs", () => {
    expect(isCapturable(req("https://example.com/search?q=hi"), res(), cfg)).toBe(false);
  });
  it("rejects admin / cart / account paths", () => {
    expect(isCapturable(req("https://example.com/wp-admin/edit.php"), res(), cfg)).toBe(false);
    expect(isCapturable(req("https://example.com/checkout"), res(), cfg)).toBe(false);
    expect(isCapturable(req("https://example.com/my-account/orders"), res(), cfg)).toBe(false);
  });
});
