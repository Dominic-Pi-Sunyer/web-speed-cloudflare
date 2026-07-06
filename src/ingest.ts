import { PLUGIN_VERSION, type WebSpeedConfig } from "./config";

/**
 * POST one rendered page to the Web Speed ingest endpoint.
 * Returns true on a 2xx, false on any error or rejection. Never throws.
 */
export async function ingestPage(
  cfg: WebSpeedConfig,
  url: string,
  html: string,
  trigger: "edge" | "baseline",
): Promise<boolean> {
  try {
    const res = await fetch(cfg.apiBase + "/v1/plugin/ingest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-web-speed-site-key": cfg.siteToken,
      },
      body: JSON.stringify({
        url,
        rendered_html: html,
        trigger,
        captured_at: new Date().toISOString(),
        plugin_version: PLUGIN_VERSION,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
