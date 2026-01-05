import { useEffect, useRef, useCallback } from 'react';

/**
 * Detect iOS (Safari, Chrome, or any browser)
 * iOS has viewport issues with all browsers due to the underlying WebKit
 */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Hook to prevent scrolling on the body when a modal/overlay is open.
 * Uses a simpler approach for iOS to avoid viewport bugs with the virtual keyboard.
 *
 * iOS Issue: Using position:fixed on body causes the viewport to get corrupted
 * when the virtual keyboard appears/disappears, leaving extra padding below
 * the nav bar until the page is reloaded.
 */
export function useScrollLock(isLocked: boolean) {
  const scrollPositionRef = useRef(0);
  const isIOSDevice = useRef(isIOS());
  const cleanupRef = useRef<(() => void) | null>(null);

  // Touch move handler for iOS - prevent scroll on body but allow scroll inside modal
  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Allow scrolling inside scrollable elements within modals
    let target = e.target as HTMLElement | null;
    while (target && target !== document.body) {
      const { overflow, overflowY } = window.getComputedStyle(target);
      const isScrollable = overflow === 'auto' || overflow === 'scroll' ||
                          overflowY === 'auto' || overflowY === 'scroll';
      const canScroll = target.scrollHeight > target.clientHeight;

      if (isScrollable && canScroll) {
        // This element can scroll, allow the touch
        return;
      }
      target = target.parentElement;
    }

    // No scrollable parent found, prevent the scroll
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!isLocked) {
      // Clean up any lingering styles when unlocking
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    // Save current scroll position
    scrollPositionRef.current = window.scrollY;

    if (isIOSDevice.current) {
      // iOS: Use simple overflow hidden + touch prevention
      // Avoid position:fixed which breaks with the virtual keyboard
      const originalOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      // Prevent touch scrolling on body
      document.addEventListener('touchmove', handleTouchMove, { passive: false });

      cleanupRef.current = () => {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.removeEventListener('touchmove', handleTouchMove);

        // Force a reflow to fix any viewport issues
        window.scrollTo(0, scrollPositionRef.current);

        // Double-check scroll position after a frame (iOS sometimes needs this)
        requestAnimationFrame(() => {
          if (window.scrollY !== scrollPositionRef.current) {
            window.scrollTo(0, scrollPositionRef.current);
          }
        });
      };

      return cleanupRef.current;
    } else {
      // Non-iOS: Use the position:fixed approach (works better for desktop scrollbars)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      const originalStyles = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        paddingRight: document.body.style.paddingRight,
      };

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      const htmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      cleanupRef.current = () => {
        document.body.style.overflow = originalStyles.overflow;
        document.body.style.position = originalStyles.position;
        document.body.style.top = originalStyles.top;
        document.body.style.left = originalStyles.left;
        document.body.style.right = originalStyles.right;
        document.body.style.width = originalStyles.width;
        document.body.style.paddingRight = originalStyles.paddingRight;
        document.documentElement.style.overflow = htmlOverflow;

        window.scrollTo(0, scrollPositionRef.current);
      };

      return cleanupRef.current;
    }
  }, [isLocked, handleTouchMove]);
}
