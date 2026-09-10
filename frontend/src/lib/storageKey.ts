/**
 * R2 object-key ownership rules.
 *
 * Two routes previously trusted a client-supplied r2Key:
 *   - /api/files/sign with op:"put" signed a PUT for ANY key in the bucket
 *   - /api/upload's confirm branch created a Book row pointing at ANY key
 * Chained, those let a user plant or overwrite another user's book file and
 * then own a row referencing it (which then satisfied the {r2Key, userId}
 * ownership check in the file proxy).
 *
 * The long-term fix is server-minted keys recorded in a PendingUpload row
 * before any presign is issued. Until that lands, every key a client sends
 * must be validated against the caller's own prefix.
 */

/** Prefix every uploaded source file for `userId` must live under. */
export function userUploadPrefix(userId: string): string {
  return `pdfs/${userId}/`;
}

/** Prefix for OCR-derived copies of a user's files. */
export function userOcrPrefix(userId: string): string {
  return `pdfs-ocr/${userId}/`;
}

/**
 * True if `key` is a well-formed key owned by `userId`.
 *
 * Rejects path traversal, absolute keys, backslashes, control characters and
 * over-long keys before the prefix check, so a crafted key can't escape the
 * user's namespace.
 */
export function isOwnedKey(key: unknown, userId: string): key is string {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > 1024) return false;
  if (key.startsWith("/")) return false;
  if (key.includes("..")) return false;
  if (key.includes("\\")) return false;
  if (key.includes("//")) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;

  return key.startsWith(userUploadPrefix(userId)) || key.startsWith(userOcrPrefix(userId));
}

/** Mint the canonical upload key for a user's file. Never accept one instead. */
export function mintUploadKey(userId: string, fileName: string): string {
  // Strip any directory component and anything outside a conservative charset,
  // so the filename cannot introduce structure into the key.
  const safeName =
    fileName
      // Split on both separators. \ is a literal backslash, written as an
      // escape so the character class stays unambiguous.
      .split(/[/\u005c]/)
      .pop()!
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180) || "upload";

  return `${userUploadPrefix(userId)}${Date.now()}-${safeName}`;
}
