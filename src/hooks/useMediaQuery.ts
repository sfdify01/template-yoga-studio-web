import { useEffect, useState } from 'react';

/**
 * Responsive utility hook to track media query matches.
 * Keeps logic inside React (UI concern) while avoiding duplicate layouts/components.
 */
export function useMediaQuery(query: string) {
  const getMatch = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Sync immediately in case the query changed.
    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handler);

    return () => {
      mediaQueryList.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}
