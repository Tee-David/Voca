/**
 * Capacitor native init — runs once on app mount when we're inside the mobile shell.
 *
 * Every plugin is imported dynamically and guarded by `isNative()` so the web
 * bundle never pulls in native-only code.
 */

let didInit = false;

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

type BackListener = () => boolean;
const backListeners: BackListener[] = [];

export function onHardwareBack(listener: BackListener): () => void {
  backListeners.push(listener);
  return () => {
    const i = backListeners.indexOf(listener);
    if (i >= 0) backListeners.splice(i, 1);
  };
}

let onlineHandler: ((online: boolean) => void) | null = null;
export function onNetworkChange(cb: (online: boolean) => void) {
  onlineHandler = cb;
}

export async function initNative() {
  if (didInit || !isNative()) return;
  didInit = true;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: "#0b0b0d" }).catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  } catch {}

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
  } catch {}

  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      for (let i = backListeners.length - 1; i >= 0; i--) {
        if (backListeners[i]()) return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp().catch(() => {});
      }
    });
  } catch {}

  try {
    const { Network } = await import("@capacitor/network");
    const status = await Network.getStatus();
    onlineHandler?.(status.connected);
    Network.addListener("networkStatusChange", (s) => onlineHandler?.(s.connected));
  } catch {}

  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch {}

  if (process.env.NEXT_PUBLIC_CAPGO_CHANNEL) {
    try {
      const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
      await CapacitorUpdater.notifyAppReady().catch(() => {});
    } catch {}
  }
}

export async function setStatusBarColor(color: string, darkContent = false) {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setBackgroundColor({ color }).catch(() => {});
    await StatusBar.setStyle({ style: darkContent ? Style.Light : Style.Dark }).catch(() => {});
  } catch {}
}

export async function shareContent(data: { title?: string; text?: string; url?: string; dialogTitle?: string }) {
  if (!isNative()) {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try { await navigator.share(data); } catch {}
    }
    return;
  }
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share(data);
  } catch {}
}
