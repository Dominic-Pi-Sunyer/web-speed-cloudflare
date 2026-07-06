import { type Env, resolveConfig } from "./config";
import { isCapturable } from "./filter";
import { sha256Hex } from "./hash";
import { hasChanged, markPushed } from "./kv";
import { ingestPage } from "./ingest";

/** ~5 MB, matching the server's ingest cap (chars ≈ bytes for HTML). */
const MAX_HTML_CHARS = 5 * 1024 * 1024;

function canonicalUrl(request: Request): string {
  const u = new URL(request.url);
  u.hash = "";
  return u.toString();
}

/**
 * Runs inside ctx.waitUntil AFTER the visitor already has their response, so it
 * can never add latency. Captures a public page's HTML and pushes it only when
 * the content changed. Fails silently — nothing here may affect the site.
 */
export async function maybeCapture(
  request: Request,
  response: Response,
  env: Env,
): Promise<void> {
  try {
    const cfg = resolveConfig(env, request);
    if (!cfg.siteToken) return;
    if (!isCapturable(request, response, cfg)) return;

    const html = await response.text();
    if (!html || html.length > MAX_HTML_CHARS) return;

    const url = canonicalUrl(request);
    const contentHash = await sha256Hex(html);
    if (!(await hasChanged(env, url, contentHash))) return;

    if (await ingestPage(cfg, url, html, "edge")) {
      await markPushed(env, url, contentHash);
    }
  } catch {
    /* never let capture affect the site */
  }
}
