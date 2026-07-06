import { type Env, resolveConfig } from "./config";

/**
 * Serve the domain-verification token at the well-known path, straight from the
 * edge. Because the Worker sits in front of the origin, verification succeeds
 * even if the origin itself wouldn't serve that path.
 */
export function serveWellKnown(env: Env): Response {
  const { verifyToken } = resolveConfig(env);
  if (!verifyToken) {
    return new Response("Not configured", { status: 404 });
  }
  return new Response(verifyToken, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
