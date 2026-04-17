export function haptic(type: "light" | "medium" | "heavy" | "success" | "error" | "selection" = "light") {
  if (typeof window === "undefined" || !window.navigator || !window.navigator.vibrate) return;
  
  try {
    switch (type) {
      case "light":
        navigator.vibrate(10);
        break;
      case "medium":
        navigator.vibrate(20);
        break;
      case "heavy":
        navigator.vibrate(40);
        break;
      case "success":
        navigator.vibrate([15, 100, 20]);
        break;
      case "error":
        navigator.vibrate([30, 50, 30, 50, 40]);
        break;
      case "selection":
        navigator.vibrate(5);
        break;
    }
  } catch (e) {
    // ignore
  }
}
