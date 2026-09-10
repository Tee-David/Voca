import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * SSRF-guarded outbound fetch.
 *
 * /api/fetch-article previously validated only the URL *protocol*, which left
 * it able to reach http://127.0.0.1, RFC1918 addresses, and cloud metadata
 * endpoints such as http://169.254.169.254/latest/meta-data/ — and it returned
 * the response body to the caller.
 *
 * Guards applied here:
 *   - http/https only, no credentials in the URL, standard ports only
 *   - every resolved A/AAAA address checked against private/reserved ranges
 *     (this is what defeats a hostname that resolves to 127.0.0.1)
 *   - redirects followed manually, re-validated per hop, capped
 *   - response size and content-type capped, wall-clock timeout
 *
 * Note on DNS rebinding: we validate the addresses we resolve, then fetch by
 * hostname, so a racing rebind is theoretically possible. Closing that fully
 * requires pinning the connection to a validated IP (a custom agent). The
 * size/type caps and the auth gate bound the damage; see the plan's §3.4
 * `article.fetch` job, which moves this off the request path entirely.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const MAX_REDIRECTS = 3;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 15_000;

export class SsrfError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = "SsrfError";
  }
}

/** True if an IP literal falls in a range we must never fetch from. */
export function isBlockedAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true; // not a valid IP -> refuse
}

function isBlockedIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;

  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // private
  if (a === 127) return true; // loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
  if (a === 169 && b === 254) return true; // link-local — cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 192 && b === 0) return true; // 192.0.0/24 + 192.0.2/24 test-net
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51) return true; // test-net-2
  if (a === 203 && b === 0) return true; // test-net-3
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // ::ffff:a.b.c.d and ::ffff:0:a.b.c.d — IPv4-mapped, judge as IPv4.
  const mapped = lower.match(/^::ffff:(?:0:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);

  if (lower === "::" || lower === "::1") return true; // unspecified, loopback
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique-local
  if (lower.startsWith("ff")) return true; // multicast
  if (lower.startsWith("2001:db8")) return true; // documentation
  if (lower.startsWith("64:ff9b")) return true; // NAT64 — can wrap a private v4
  return false;
}

/** Validate a single URL: shape, then every address its hostname resolves to. */
export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new SsrfError("Only http and https URLs are supported");
  }
  if (url.username || url.password) {
    throw new SsrfError("URLs with embedded credentials are not allowed");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new SsrfError("Port not allowed");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  // A bare IP literal never needs DNS.
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new SsrfError("Address not allowed", 403);
    return url;
  }

  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new SsrfError("Address not allowed", 403);
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SsrfError("Could not resolve host", 400);
  }
  if (!addresses.length) throw new SsrfError("Could not resolve host", 400);

  // Every address must pass — one private answer is enough to refuse.
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) throw new SsrfError("Address not allowed", 403);
  }

  return url;
}

export type SafeFetchResult = { url: URL; html: string };

/** Fetch HTML with redirects validated per hop and the body size capped. */
export async function safeFetchHtml(raw: string): Promise<SafeFetchResult> {
  let current = await assertSafeUrl(raw);
  const deadline = Date.now() + TIMEOUT_MS;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new SsrfError("Request timed out", 504);

    const res = await fetch(current.toString(), {
      redirect: "manual", // we re-validate each hop ourselves
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Voca/1.0; +https://voca.app) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(remaining),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new SsrfError("Redirect without a location", 502);
      current = await assertSafeUrl(new URL(location, current).toString());
      continue;
    }

    if (!res.ok) {
      throw new SsrfError(`Failed to fetch page (${res.status})`, 502);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/^(text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
      throw new SsrfError("Page is not HTML", 415);
    }

    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > MAX_BYTES) throw new SsrfError("Page too large", 413);

    const html = await readCapped(res, MAX_BYTES);
    return { url: current, html };
  }

  throw new SsrfError("Too many redirects", 502);
}

/** Stream the body, aborting once the cap is exceeded (Content-Length can lie). */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new SsrfError("Page too large", 413);
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}
