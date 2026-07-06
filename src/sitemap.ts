/** Pure sitemap XML parsing — kept separate so it is unit-testable without network. */
export function parseSitemapXml(xml: string): { isIndex: boolean; locs: string[] } {
  const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map(
    (m) => m[1],
  );
  return { isIndex: xml.includes("<sitemapindex"), locs };
}
