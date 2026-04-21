import { headers } from "next/headers";
import { decode } from "next-auth/jwt";
import { auth } from "./auth";

const SALT = "authjs.session-token";

export type SessionUser = { id: string; email?: string | null; name?: string | null };

export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  }

  const headerBag = req?.headers ?? (await headers());
  const authHeader = headerBag.get("authorization") ?? headerBag.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const payload = await decode({ token, secret, salt: SALT });
    if (!payload?.id) return null;
    return {
      id: payload.id as string,
      email: (payload.email as string) ?? null,
      name: (payload.name as string) ?? null,
    };
  } catch {
    return null;
  }
}

export { SALT as MOBILE_JWT_SALT };
