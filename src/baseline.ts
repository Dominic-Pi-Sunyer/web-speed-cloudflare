import { type Env, resolveConfig } from "./config";
import { sha256Hex } from "./hash";
import { hasChanged, markPushed } from "./kv";
import { ingestPage } from "./ingest";
import { parseSitemapXml } from "./sitemap";

const UA = "WebSpeed-CF/1.0 (+https://getwebspeed.io)";
const MAX_URLS = 2000; // sitemap entries considered per run
const MAX_PUSH_PER_RUN = 100; // stay well under the server's 120 ingests / 60s
const MAX_HTML_CHARS = 5 * 1024 * 1024;

/**
 * Weekly job: fetch the sitemap and refresh any public page whose content
 * changed. This covers low-traffic pages that never trigger the on-visit
 * capture. Large sites drain across successive weekly runs (unchanged pages are
 * skipped cheaply via the KV fingerprint).
 */
export async function runBaseline(env: Env): Promise<void> {
  const cfg = resolveConfig(env);
  if (!cfg.siteToken || !cfg.domain) return;

  const base = "https://" + cfg.domain;
  const urls = await collectSitemapUrls(base);

  let pushed = 0;
  for (const url of urls) {
    if (pushed >= MAX_PUSH_PER_RUN) break;
    try {
      const resp = await fetch(url, { headers: { "user-agent": UA } });
      if (!resp.ok) continue;
      const ct = (resp.headers.get("content-type") || "").toLowerCase();
      if (!ct.includes("text/html")) continue;

      const html = await resp.text();
      if (!html || html.length > MAX_HTML_CHARS) continue;

      const contentHash = await sha256Hex(html);
      if (!(await hasChanged(env, url, contentHash))) continue;

      if (await ingestPage(cfg, url, html, "baseline")) {
        await markPushed(env, url, contentHash);
        pushed++;
      }
    } catch {
      /* skip this URL */
    }
  }
}

/** Follow sitemap.xml (and a sitemap index one level deep) and return page URLs. */
async function collectSitemapUrls(base: string): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();

  async function load(sitemapUrl: string, depth: number): Promise<void> {
    if (depth > 2 || out.length >= MAX_URLS || seen.has(sitemapUrl)) return;
    seen.add(sitemapUrl);

    let xml: string;
    try {
      const resp = await fetch(sitemapUrl, { headers: { "user-agent": UA } });
      if (!resp.ok) return;
      xml = await resp.text();
    } catch {
      return;
    }

    const { isIndex, locs } = parseSitemapXml(xml);
    if (isIndex) {
      for (const loc of locs) await load(loc, depth + 1);
    } else {
      for (const loc of locs) {
        if (out.length >= MAX_URLS) break;
        out.push(loc);
      }
    }
  }

  for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"]) {
    if (out.length > 0) break;
    await load(base + path, 0);
  }
  return out;
}
