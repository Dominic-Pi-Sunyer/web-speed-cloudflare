/**
 * Runtime configuration and shared types.
 *
 * `resolveConfig` is the ONE place config is read from the environment. That single
 * seam is what lets the v1 "paste a token" install and a future one-click
 * Cloudflare-OAuth auto-provision share identical Worker code — only *who* sets
 * these values differs, never the code that consumes them.
 */

export const PLUGIN_VERSION = "WebSpeed-CF/1.0.0";
export const WELL_KNOWN_PATH = "/.well-known/webspeed-verify.txt";
export const DEFAULT_API_BASE = "https://api.getwebspeed.io";

export interface Env {
  /** wsp_site_… token issued by getwebspeed.io. Set via `wrangler secret put`. */
  WEBSPEED_SITE_TOKEN: string;
  /** Domain-verification challenge value from registration. Set as a secret. */
  WEBSPEED_VERIFY_TOKEN: string;
  /** Override the API base (staging / self-host). Optional. */
  WEBSPEED_API_BASE?: string;
  /** Explicit registrable domain. Optional — derived from the request host if unset. */
  WEBSPEED_SITE_DOMAIN?: string;
  /** Reverse-proxy origin. Optional — when set, the Worker proxies this origin
   *  instead of its own host (e.g. to run on a workers.dev subdomain in front of
   *  a separate site). Unset = transparent proxy on the Worker's own zone. */
  WEBSPEED_ORIGIN?: string;
  /** KV namespace holding the per-URL content hash (dedup + throttle). */
  WEBSPEED_KV: KVNamespace;
}

export interface WebSpeedConfig {
  siteToken: string;
  verifyToken: string;
  apiBase: string;
  domain: string | null;
}

export function resolveConfig(env: Env, request?: Request): WebSpeedConfig {
  let domain = (env.WEBSPEED_SITE_DOMAIN || "").trim().toLowerCase();
  if (!domain && request) {
    try {
      domain = new URL(request.url).hostname.toLowerCase();
    } catch {
      domain = "";
    }
  }
  return {
    siteToken: (env.WEBSPEED_SITE_TOKEN || "").trim(),
    verifyToken: (env.WEBSPEED_VERIFY_TOKEN || "").trim(),
    apiBase: (env.WEBSPEED_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, ""),
    domain: domain || null,
  };
}
