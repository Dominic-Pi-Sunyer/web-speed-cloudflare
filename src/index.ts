import { type Env, WELL_KNOWN_PATH } from "./config";
import { serveWellKnown } from "./wellknown";
import { maybeCapture } from "./capture";
import { originRequest } from "./proxy";
import { runBaseline } from "./baseline";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Safety net: if anything in this Worker throws, Cloudflare serves the origin
    // response directly instead of erroring — a bug here can never break the site.
    ctx.passThroughOnException();

    // Answer the domain-verification check right at the edge.
    let pathname = "";
    try {
      pathname = new URL(request.url).pathname;
    } catch {
      pathname = "";
    }
    if (pathname === WELL_KNOWN_PATH) {
      return serveWellKnown(env);
    }

    // Pass through to the origin. On the Worker's own zone this is a transparent
    // proxy (subrequests bypass this Worker, so no loop); if WEBSPEED_ORIGIN is
    // set it proxies that separate origin instead (e.g. running on workers.dev).
    const response = await fetch(originRequest(request, env.WEBSPEED_ORIGIN));

    // Capture in the background — the visitor already has `response`.
    ctx.waitUntil(maybeCapture(request, response.clone(), env));
    return response;
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    // Weekly baseline sweep (cadence set by the cron trigger in wrangler.toml).
    ctx.waitUntil(runBaseline(env));
  },
};
