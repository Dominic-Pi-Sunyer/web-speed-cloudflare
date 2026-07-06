import { describe, it, expect } from "vitest";
import { parseSitemapXml } from "../src/sitemap";

describe("parseSitemapXml", () => {
  it("extracts page locations from a urlset", () => {
    const xml =
      "<urlset><url><loc>https://ex.com/a</loc></url><url><loc> https://ex.com/b </loc></url></urlset>";
    const r = parseSitemapXml(xml);
    expect(r.isIndex).toBe(false);
    expect(r.locs).toEqual(["https://ex.com/a", "https://ex.com/b"]);
  });
  it("detects a sitemap index and returns child sitemap URLs", () => {
    const xml =
      "<sitemapindex><sitemap><loc>https://ex.com/sm1.xml</loc></sitemap></sitemapindex>";
    const r = parseSitemapXml(xml);
    expect(r.isIndex).toBe(true);
    expect(r.locs).toEqual(["https://ex.com/sm1.xml"]);
  });
  it("returns nothing for empty / non-sitemap input", () => {
    expect(parseSitemapXml("<html></html>").locs).toEqual([]);
  });
});
