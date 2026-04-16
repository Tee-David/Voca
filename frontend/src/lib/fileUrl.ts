/**
 * Resolve a download URL for a given r2Key.
 * Since we replaced S3 direct fetching with a Next.js proxy to fix CORS,
 * the URL is simply the proxied route.
 */
export async function getFileUrl(r2Key: string): Promise<string> {
  return `/api/files/${r2Key}`;
}
