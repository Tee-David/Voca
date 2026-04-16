const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

export function getPublicUrl(key: string) {
  return `${PUBLIC_URL}/${key}`;
}
