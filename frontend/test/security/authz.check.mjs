// Verify the object-key ownership rules and the rate limiter.
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const ts = require("typescript");
const fs = require("node:fs");

async function load(path, stripNext = false) {
  let src = fs.readFileSync(path, "utf8");
  if (stripNext) {
    // rateLimit.ts imports next/server only for the 429 response builder.
    src = src.replace(/^import \{ NextResponse \}.*$/m, "const NextResponse = { json: (b, i) => ({ body: b, ...i }) };");
  }
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));
}

const { isOwnedKey, mintUploadKey } = await load(new URL("../../src/lib/storageKey.ts", import.meta.url));
const { rateLimit } = await load(new URL("../../src/lib/rateLimit.ts", import.meta.url), true);

const ME = "user_aaa";
const THEM = "user_bbb";
let failures = 0;
const check = (cond, label) => { if (!cond) { console.log(`FAIL ${label}`); failures++; } };

// --- keys that must be accepted (including pre-existing real-world shapes) ---
for (const k of [
  `pdfs/${ME}/1712345678901-book.pdf`,
  `pdfs/${ME}/1712345678901-My Book Title.pdf`,   // legacy keys contain spaces
  `pdfs-ocr/${ME}/1712345678901-book.pdf`,        // OCR route rewrites pdfs/ -> pdfs-ocr/
]) check(isOwnedKey(k, ME), `should accept ${k}`);

// --- the attacks this closes ---
for (const k of [
  `pdfs/${THEM}/1712345678901-book.pdf`,     // another user's object (the sign+confirm chain)
  `pdfs-ocr/${THEM}/x.pdf`,
  `pdfs/${ME}/../${THEM}/x.pdf`,             // traversal out of own prefix
  `pdfs/${ME}/..%2f..%2fx`,                  // encoded-ish traversal
  `/pdfs/${ME}/x.pdf`,                       // absolute
  `pdfs/${ME}//x.pdf`,                       // empty segment
  `pdfs/${ME}/x\..\y.pdf`,                 // backslash separator
  `pdfs/${ME}x/other.pdf`,                   // prefix confusion: userId is a substring
  "", "pdfs/", `pdfs/${ME}`,                 // truncated / no trailing slash
  `secrets/${ME}/x`,                         // wrong namespace
  null, undefined, 42, {},                   // non-strings
]) check(!isOwnedKey(k, ME), `should reject ${JSON.stringify(k)}`);

// A control character must not slip through.
check(!isOwnedKey(`pdfs/${ME}/a\u0000b.pdf`, ME), "should reject NUL in key");

// --- minted keys are always self-owned and structurally safe ---
for (const name of [
  "../../etc/passwd", "C:\Windows\win.ini", "a/b/c.pdf",
  "wei\u0308rd  name!!.pdf", "", "x".repeat(400),
]) {
  const key = mintUploadKey(ME, name);
  check(isOwnedKey(key, ME), `minted key self-owned for ${JSON.stringify(name)} -> ${key}`);
  check(!key.includes(".."), `minted key has no traversal for ${JSON.stringify(name)}`);
  check(key.split("/").length === 3, `minted key has exactly 3 segments -> ${key}`);
}

// --- rate limiter: allows up to the limit, then blocks ---
const key = "test:" + Math.random();
let allowed = 0;
for (let i = 0; i < 12; i++) if (rateLimit(key, 10, 60).ok) allowed++;
check(allowed === 10, `limiter allowed ${allowed}, expected 10`);
check(rateLimit(key, 10, 60).retryAfterSec > 0, "limiter reports Retry-After");
// Independent keys must not share a bucket.
check(rateLimit("other:" + Math.random(), 10, 60).ok, "separate keys are independent");

console.log(failures === 0 ? "PASS  all authz assertions" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
