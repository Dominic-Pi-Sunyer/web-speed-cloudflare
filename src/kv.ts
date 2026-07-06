import type { Env } from "./config";
import { sha256Hex } from "./hash";

/** A URL's fingerprint is kept at least this long (also bounds re-checks). */
const HASH_TTL_SECONDS = 7 * 24 * 3600;

async function keyFor(url: string): Promise<string> {
  return "h:" + (await sha256Hex(url)).slice(0, 40);
}

/** True if this URL is new, or its content changed since we last pushed it. */
export async function hasChanged(
  env: Env,
  url: string,
  contentHash: string,
): Promise<boolean> {
  const prev = await env.WEBSPEED_KV.get(await keyFor(url));
  return prev !== contentHash;
}

/** Record that we pushed this URL's current content. */
export async function markPushed(
  env: Env,
  url: string,
  contentHash: string,
): Promise<void> {
  await env.WEBSPEED_KV.put(await keyFor(url), contentHash, {
    expirationTtl: HASH_TTL_SECONDS,
  });
}
