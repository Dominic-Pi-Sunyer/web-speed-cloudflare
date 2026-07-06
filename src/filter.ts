import type { WebSpeedConfig } from "./config";

/** Path segments that indicate a private / non-public page — never captured. */
const DENY_SEGMENTS = new Set<string>([
  "wp-admin", "wp-login", "wp-json", "wp-content", "wp-includes",
  "admin", "account", "accounts", "dashboard", "profile",
  "checkout", "cart", "basket", "orders", "order",
  "login", "logout", "signin", "sign-in", "signout", "sign-out",
  "register", "my-account", "settings", "billing",
  "payment", "payments", "password", "reset-password", "feed",
]);

/** Cookie name fragments that indicate a logged-in / personalized session. */
const LOGIN_COOKIE_HINTS = [
  "wordpress_logged_in", "wordpress_sec", "wp-postpass", "comment_author",
  "woocommerce_", "edd_", "logged_in", "auth_token", "access_token",
  "sessionid", "phpsessid", "connect.sid", "laravel_session",
];

function stripWww(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Decide whether a response may be captured and sent to Web Speed. Conservative
 * by design: only clearly-public HTML pages pass. The server independently
 * re-checks shareability, so this is defense in depth, not the only gate.
 */
export function isCapturable(
  request: Request,
  response: Response,
  cfg: WebSpeedConfig,
): boolean {
  if (request.method !== "GET") return false;
  if (response.status !== 200) return false;

  const ct = (response.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("text/html")) return false;

  // Honor the origin's own caching intent.
  const cc = (response.headers.get("cache-control") || "").toLowerCase();
  if (cc.includes("private") || cc.includes("no-store")) return false;
  const vary = (response.headers.get("vary") || "").toLowerCase();
  if (vary.includes("cookie") || vary.includes("authorization")) return false;

  // Never capture a logged-in / personalized view.
  const cookie = (request.headers.get("cookie") || "").toLowerCase();
  if (LOGIN_COOKIE_HINTS.some((h) => cookie.includes(h))) return false;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  // Only this site's own domain (www treated as equal to the apex).
  if (cfg.domain && stripWww(url.hostname) !== stripWww(cfg.domain)) return false;

  // Skip query strings (search / filters / tracking dupes). The weekly sitemap
  // sweep covers canonical URLs, so nothing important is lost here.
  if (url.search) return false;

  const segments = url.pathname.toLowerCase().split("/").filter(Boolean);
  if (segments.some((s) => DENY_SEGMENTS.has(s))) return false;

  return true;
}
