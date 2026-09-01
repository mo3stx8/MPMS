import { useEffect, useRef } from 'react';

export function useIdleTimer(onIdle: () => void, timeoutMs: number = 300000, isActive: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const handleActivity = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onIdle();
      }, timeoutMs);
    };

    // Initial setup
    handleActivity();

    const events = [
      'mousemove',
      'keydown',
      'wheel',
      'DOMMouseScroll',
      'mouseWheel',
      'mousedown',
      'touchstart',
      'touchmove',
      'MSPointerDown',
      'MSPointerMove'
    ];

    // Add passive event listeners to protect main thread scrolling
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [onIdle, timeoutMs, isActive]);
}
