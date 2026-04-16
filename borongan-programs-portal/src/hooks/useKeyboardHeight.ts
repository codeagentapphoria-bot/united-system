import { useState, useEffect } from 'react';

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleVisualViewportChange = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const heightDiff = window.innerHeight - viewport.height;
        setKeyboardHeight(heightDiff > 0 ? heightDiff : 0);
      }
    };

    handleVisualViewportChange();
    window.visualViewport?.addEventListener('resize', handleVisualViewportChange);
    return () => window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
  }, []);

  return keyboardHeight;
}