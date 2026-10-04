import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";



export const isMacOS =
  typeof navigator !== "undefined" &&
  (navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0);

export const isWindows =
  typeof navigator !== "undefined" &&
  (navigator.platform.toUpperCase().indexOf("WIN") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("WIN") >= 0);

export const isLinux =
  typeof navigator !== "undefined" &&
  !isMacOS &&
  !isWindows &&
  (navigator.platform.toUpperCase().indexOf("LINUX") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("LINUX") >= 0);

/**
 * Handles mousedown on draggable titlebar areas.
 * - Single click: native OS window dragging
 * - Detail > 1 (multi-click): skip to let double-click handle it cleanly
 */
export function handleWindowDragOrMaximize(e: React.MouseEvent) {
  const target = e.target as HTMLElement;
  if (
    target.closest(
      "button, input, select, textarea, a, [role='button'], [data-no-drag], .drag-exclude"
    )
  ) {
    return;
  }

  // Only handle primary (left) button clicks
  if (e.button !== 0) return;

  // Let onDoubleClick handle double-clicks without interference
  if (e.detail > 1) return;

  try {
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then((isMax) => {
      if (!isMax) appWindow.startDragging();
    }).catch(() => {});
  } catch (err) {
    console.debug("Window drag error:", err);
  }
}

/**
 * Double-click handler to toggle maximize / zoom across platforms.
 */
export function handleWindowDoubleClick(e: React.MouseEvent) {
  const target = e.target as HTMLElement;
  if (
    target.closest(
      "button, input, select, textarea, a, [role='button'], [data-no-drag], .drag-exclude"
    )
  ) {
    return;
  }
  if (e.button !== 0) return;

  // On macOS, elements with data-tauri-drag-region (-webkit-app-region: drag) are handled natively by macOS AppKit.
  // Triggering appWindow.toggleMaximize() simultaneously creates a race condition where the window unzooms and then immediately re-maximizes.
  const isDragRegion = Boolean(target.closest("[data-tauri-drag-region]"));
  if (isMacOS && isDragRegion) {
    // Let native macOS AppKit handle titlebar zoom
    return;
  }

  toggleWindowMaximize();
}

export async function minimizeWindow() {
  try {
    await getCurrentWindow().minimize();
  } catch (err) {
    console.error("Failed to minimize window:", err);
  }
}

let lastToggleTime = 0;
export async function toggleWindowMaximize() {
  const now = Date.now();
  if (now - lastToggleTime < 350) return;
  lastToggleTime = now;
  try {
    await getCurrentWindow().toggleMaximize();
  } catch (err) {
    console.error("Failed to toggle maximize:", err);
  }
}

export async function closeWindow() {
  try {
    await getCurrentWindow().close();
  } catch (err) {
    console.error("Failed to close window:", err);
  }
}

/**
 * Hook to track whether the window is currently maximized (for Windows/Linux icon toggle).
 */
export function useIsMaximized() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlistenResize: (() => void) | undefined;

    async function check() {
      try {
        const appWindow = getCurrentWindow();
        const isMax = await appWindow.isMaximized();
        setMaximized(isMax);

        unlistenResize = await appWindow.onResized(async () => {
          const m = await appWindow.isMaximized();
          setMaximized(m);
        });
      } catch (err) {
        console.debug("useIsMaximized error:", err);
      }
    }

    check();

    return () => {
      if (unlistenResize) unlistenResize();
    };
  }, []);

  return maximized;
}
