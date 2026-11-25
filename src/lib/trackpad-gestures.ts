// Trackpad / pointer gesture primitives. macOS Chromium delivers pinch-zoom and
// smart zoom (two-finger double-tap) as `wheel` with `ctrlKey` set; they differ
// only by whether the deltas are zero.
export interface WheelLike {
  ctrlKey: boolean
  deltaX: number
  deltaY: number
}

export function isSmartZoomWheel(e: WheelLike): boolean {
  return e.ctrlKey && e.deltaX === 0 && e.deltaY === 0
}

export function isPinchZoomWheel(e: WheelLike): boolean {
  return e.ctrlKey && (e.deltaX !== 0 || e.deltaY !== 0)
}

export const DOUBLE_TAP_MS = 300

export function createDoubleTapDetector(thresholdMs: number = DOUBLE_TAP_MS): (now?: number) => boolean {
  let last = 0

  return (now: number = Date.now()): boolean => {
    if (now - last < thresholdMs) {
      last = 0

      return true
    }

    last = now

    return false
  }
}
