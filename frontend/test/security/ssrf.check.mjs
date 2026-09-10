// Verify the SSRF address classifier against the ranges that matter.
// Mirrors src/lib/ssrf.ts isBlockedAddress; run after any change to it.
import { createRequire } from "node:module";
// Resolve typescript from the frontend package regardless of cwd.
const require = createRequire(new URL("../../package.json", import.meta.url));
const ts = require("typescript");
const fs = require("node:fs");

const src = fs.readFileSync(new URL("../../src/lib/ssrf.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const mod = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
const { isBlockedAddress, assertSafeUrl } = mod;

const mustBlock = [
  "127.0.0.1", "127.1.2.3", "0.0.0.0", "10.0.0.1", "10.255.255.255",
  "172.16.0.1", "172.31.255.255", "192.168.1.1", "192.168.0.254",
  "169.254.169.254",            // AWS/GCP/Azure instance metadata
  "100.64.0.1",                 // CGNAT
  "224.0.0.1", "239.255.255.255", "255.255.255.255",
  "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1",
  "::ffff:127.0.0.1",           // IPv4-mapped loopback
  "::ffff:169.254.169.254",     // IPv4-mapped metadata
  "64:ff9b::7f00:1",            // NAT64-wrapped loopback
  "not-an-ip", "",
];

const mustAllow = [
  "1.1.1.1", "8.8.8.8", "93.184.216.34", "142.250.191.78",
  "2606:4700:4700::1111", "2001:4860:4860::8888",
];

let failures = 0;
for (const ip of mustBlock) {
  if (!isBlockedAddress(ip)) { console.log(`FAIL should block: ${JSON.stringify(ip)}`); failures++; }
}
for (const ip of mustAllow) {
  if (isBlockedAddress(ip)) { console.log(`FAIL should allow: ${ip}`); failures++; }
}

// URL-level guards
const badUrls = [
  "file:///etc/passwd",
  "gopher://evil/",
  "http://user:pass@example.com/",
  "http://example.com:22/",
  "http://localhost/admin",
  "http://foo.localhost/",
  "http://169.254.169.254/latest/meta-data/",
  "http://[::1]:80/",
  "not a url",
];
for (const u of badUrls) {
  try { await assertSafeUrl(u); console.log(`FAIL should reject URL: ${u}`); failures++; }
  catch { /* expected */ }
}

console.log(failures === 0
  ? `PASS  ${mustBlock.length + mustAllow.length + badUrls.length} assertions`
  : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
