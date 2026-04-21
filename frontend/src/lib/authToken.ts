import { setAuthToken } from "./api";

const KEY = "voca.authToken";

async function readStored(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const mod = await import("@capacitor/preferences").catch(() => null);
    if (mod?.Preferences) {
      const { value } = await mod.Preferences.get({ key: KEY });
      return value ?? null;
    }
  } catch {}
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

async function writeStored(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    const mod = await import("@capacitor/preferences").catch(() => null);
    if (mod?.Preferences) {
      if (token) await mod.Preferences.set({ key: KEY, value: token });
      else await mod.Preferences.remove({ key: KEY });
      return;
    }
  } catch {}
  try {
    if (token) window.localStorage.setItem(KEY, token);
    else window.localStorage.removeItem(KEY);
  } catch {}
}

export async function loadStoredAuthToken(): Promise<string | null> {
  const token = await readStored();
  if (token) setAuthToken(token);
  return token;
}

export async function persistAuthToken(token: string) {
  setAuthToken(token);
  await writeStored(token);
}

export async function clearStoredAuthToken() {
  setAuthToken(null);
  await writeStored(null);
}
