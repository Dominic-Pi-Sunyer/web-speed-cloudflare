# Web Speed for Cloudflare

Publish fresh, first-party maps of your pages to the **agentic web** — from any site behind Cloudflare, with no changes to your app.

This is a Cloudflare Worker that runs at the edge, in front of your site. As real visitors load your public pages, it keeps a copy of the rendered HTML and sends it to [Web Speed](https://getwebspeed.io) whenever a page changes — so AI agents read an accurate, up-to-date, first-party map of your content instead of scraping and guessing.

It's the same idea as the Web Speed WordPress plugin, but at the **network layer**: it works for any stack (WordPress, custom, static, headless), and because it sits *in front of* your origin it can never slow down or break your site.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Dominic-Pi-Sunyer/web-speed-cloudflare)

One click deploys the Worker to your own Cloudflare account. Then register your domain at [getwebspeed.io](https://getwebspeed.io) and add your two tokens as Worker **secrets** — see [Install](#install). Prefer the CLI? Use the manual steps below.

## How it works

1. Every request passes through the Worker to your origin — untouched, no added latency.
2. On the way back, the Worker keeps a copy of the response **in the background** (`ctx.waitUntil`), so the visitor is never blocked.
3. It captures only **public HTML pages** — skipping logged-in/personalized views, admin, cart, checkout, search, and query-string URLs.
4. It fingerprints each page (SHA-256) in **Workers KV** and pushes to Web Speed **only when the content changed** — no spam, no duplicates.
5. A **weekly Cron Trigger** reads your `sitemap.xml` and refreshes low-traffic pages that never get organic hits.
6. The Worker also serves `/.well-known/webspeed-verify.txt` at the edge, so domain verification is automatic.

Your busiest pages stay the freshest, automatically — the traffic does the work.

## Requirements

- Your domain is on **Cloudflare** (any plan, including Free).
- A free Web Speed publisher account (created when you register your domain).

## Install

1. **Register** your domain at [getwebspeed.io](https://getwebspeed.io) → you receive a `site_token` and a `verify_token`.
2. **Create a KV namespace** and paste its id into `wrangler.toml`:
   ```bash
   wrangler kv namespace create WEBSPEED_KV
   ```
3. **Set your route** in `wrangler.toml` (`pattern` / `zone_name` for your domain).
4. **Add your secrets** (never commit these):
   ```bash
   wrangler secret put WEBSPEED_SITE_TOKEN
   wrangler secret put WEBSPEED_VERIFY_TOKEN
   ```
5. **Deploy:**
   ```bash
   pnpm install
   pnpm run deploy
   ```
6. **Verify** your domain from the getwebspeed.io dashboard — the Worker already serves the verification file.

## Configuration

| Name | Where | Purpose |
| --- | --- | --- |
| `WEBSPEED_SITE_TOKEN` | secret | Your site token from registration |
| `WEBSPEED_VERIFY_TOKEN` | secret | Domain-verification challenge value |
| `WEBSPEED_API_BASE` | var | API base (default `https://api.getwebspeed.io`) |
| `WEBSPEED_SITE_DOMAIN` | var (optional) | Force the domain; otherwise derived from the request host |
| `WEBSPEED_KV` | KV binding | Per-URL content-hash store (dedup + throttle) |

## Privacy

The Worker sends only the rendered HTML of pages that are **already public** on your site, plus their URLs. It never sends logged-in, private, cart/checkout, admin, or query-string pages, and the Web Speed server independently rejects anything that looks personalized or auth-gated. Your `site_token` is stored as a Worker secret and is never committed here.

By connecting your site you agree to Web Speed's [Terms of Service and Privacy Policy](https://getwebspeed.io/legal).

## Development

```bash
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest
pnpm dev           # wrangler dev (local)
```

## License

[GPL-2.0-or-later](https://www.gnu.org/licenses/gpl-2.0.html).
