import { useEffect, useRef } from 'react';

/**
 * Hook to prevent scrolling on the body when a modal/overlay is open.
 * Works reliably across all platforms including iOS Safari.
 */
export function useScrollLock(isLocked: boolean) {
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    if (!isLocked) return;

    // Save current scroll position
    scrollPositionRef.current = window.scrollY;

    // Get the scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Apply styles to prevent scrolling
    const originalStyles = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    };

    // Lock the body in place
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    // Add padding to compensate for scrollbar disappearing
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Also set on html element for extra insurance
    const htmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // Restore original styles
      document.body.style.overflow = originalStyles.overflow;
      document.body.style.position = originalStyles.position;
      document.body.style.top = originalStyles.top;
      document.body.style.left = originalStyles.left;
      document.body.style.right = originalStyles.right;
      document.body.style.width = originalStyles.width;
      document.body.style.paddingRight = originalStyles.paddingRight;
      document.documentElement.style.overflow = htmlOverflow;

      // Restore scroll position
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, [isLocked]);
}
