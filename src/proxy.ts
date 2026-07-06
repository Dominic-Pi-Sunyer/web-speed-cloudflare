/**
 * Optional reverse-proxy mode.
 *
 * When WEBSPEED_ORIGIN is set, the Worker fetches that origin instead of the
 * request's own host — which lets it run on a workers.dev subdomain (or any
 * front) in front of a separate origin site. When unset, the Worker is a
 * transparent proxy on its own Cloudflare zone (the default / production mode).
 */
export function originRequest(request: Request, originBase?: string): Request {
  if (!originBase) return request;

  let target: URL;
  let origin: URL;
  try {
    target = new URL(request.url);
    origin = new URL(originBase);
  } catch {
    return request;
  }

  target.protocol = origin.protocol;
  target.host = origin.host; // includes port

  const headers = new Headers(request.headers);
  headers.delete("host"); // let fetch set Host from the new URL

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(target.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
  });
}
