import { useCallback, useRef } from 'react';

const DOUBLE_TAP_DELAY = 300; // ms

type DoubleTapHandler = (e: React.PointerEvent | React.MouseEvent) => void;

/**
 * A hook that provides unified double-click/double-tap detection for both mouse and touch.
 * On desktop, it responds to double-clicks. On mobile, it detects double-taps.
 *
 * @param onDoubleTap - Callback to invoke on double-click or double-tap
 * @returns Event handlers to attach to the element
 */
export function useDoubleTap(onDoubleTap: DoubleTapHandler) {
  const lastTapTimeRef = useRef<number>(0);
  const lastTapTargetRef = useRef<EventTarget | null>(null);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Only handle touch events - mouse uses onDoubleClick
      if (e.pointerType !== 'touch') return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTapTimeRef.current;
      const isSameTarget = lastTapTargetRef.current === e.currentTarget;

      if (timeSinceLastTap < DOUBLE_TAP_DELAY && isSameTarget) {
        // Double tap detected
        e.stopPropagation();
        onDoubleTap(e);
        lastTapTimeRef.current = 0;
        lastTapTargetRef.current = null;
      } else {
        // First tap
        lastTapTimeRef.current = now;
        lastTapTargetRef.current = e.currentTarget;
      }
    },
    [onDoubleTap]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleTap(e);
    },
    [onDoubleTap]
  );

  return {
    onPointerUp: handlePointerUp,
    onDoubleClick: handleDoubleClick,
  };
}
