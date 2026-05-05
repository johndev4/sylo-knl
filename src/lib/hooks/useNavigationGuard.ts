import { useEffect } from 'react';

/**
 * Hook to prevent data loss by prompting the user when they try to leave
 * the page with unsaved changes.
 * 
 * Covers:
 * 1. Closing tab/browser (beforeunload)
 * 2. Internal Next.js navigation (by intercepting link clicks)
 */
export function useNavigationGuard(isDirty: boolean) {
  // 1. Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers show a generic message regardless of the string returned
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 2. Handle internal navigation (experimental but effective for App Router)
  useEffect(() => {
    if (!isDirty) return;

    const handleInternalNavigation = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      if (anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href) return;

      if (!(href.startsWith('/') || href.startsWith(window.location.origin))) {
        return;
      }

      // Ignore pure hash navigation on same path/query.
      const url = new URL(href, window.location.origin);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );

      if (!confirmed) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    // Capture phase to intercept clicks before Next.js Link component handles them
    document.addEventListener('click', handleInternalNavigation, true);
    
    return () => {
      document.removeEventListener('click', handleInternalNavigation, true);
    };
  }, [isDirty]);
}
