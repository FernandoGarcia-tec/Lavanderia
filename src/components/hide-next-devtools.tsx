"use client";

import { useEffect } from "react";

// Known selectors for Next.js DevTools, overlay, and issues badge
const SELECTORS = [
  '[data-next-badge]',
  'button[data-nextjs-dev-tools-button]',
  '[data-nextjs-dev-overlay]',
  '[data-next-mark]',
  'svg[data-next-mark-loading]',
  '[data-issues]',
  '[data-issues-open]',
  '[data-issues-collapse]',
  '[aria-controls="nextjs-dev-tools-menu"]',
  // Additional common identifiers seen in newer Next versions
  '#nextjs-devtools',
  'nextjs-portal',
  'nextjs-overlay',
  'nextjs-devtools',
  '[id^="nextjs-"]',
  '[class*="nextjs-devtools"]',
];

export function HideNextDevTools() {
  useEffect(() => {
    const hardHide = (el: HTMLElement) => {
      try { el.remove(); } catch {}
      try {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointerEvents', 'none', 'important');
        el.style.setProperty('opacity', '0', 'important');
      } catch {}
      try {
        const parent = el.parentElement as HTMLElement | null;
        if (parent) {
          if (
            parent.querySelector('[data-issues]') ||
            el.matches('[data-nextjs-dev-tools-button]') ||
            parent.tagName.toLowerCase().includes('nextjs')
          ) {
            parent.style.setProperty('display', 'none', 'important');
          }
        }
      } catch {}
    };

    const hideInRoot = (root: Document | ShadowRoot) => {
      try {
        SELECTORS.forEach((sel) => {
          root.querySelectorAll<HTMLElement>(sel).forEach((el) => hardHide(el));
        });
        // Attempt to hide any element whose tag contains nextjs-* (custom elements)
        Array.from(root.querySelectorAll<HTMLElement>('nextjs-portal, nextjs-overlay, nextjs-devtools')).forEach(hardHide);
      } catch {}
    };

    const hideEverywhere = () => {
      hideInRoot(document);
      // Shadow DOMs
      try {
        document.querySelectorAll<HTMLElement>('*').forEach((node) => {
          const anyNode = node as any;
          if (anyNode && anyNode.shadowRoot) {
            hideInRoot(anyNode.shadowRoot as ShadowRoot);
          }
        });
      } catch {}
      // Iframes (rare but just in case)
      try {
        document.querySelectorAll<HTMLIFrameElement>('iframe').forEach((frame) => {
          try {
            const doc = frame.contentDocument;
            if (doc) hideInRoot(doc);
          } catch {}
        });
      } catch {}
    };

    // Initial and repeated attempts
    hideEverywhere();
    const obs = new MutationObserver(() => hideEverywhere());
    obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    const int = window.setInterval(hideEverywhere, 500);
    // Extra quick passes right after mount
    let rafRuns = 0;
    const rafLoop = () => {
      hideEverywhere();
      if (rafRuns++ < 10) requestAnimationFrame(rafLoop);
    };
    requestAnimationFrame(rafLoop);
    return () => {
      obs.disconnect();
      window.clearInterval(int);
    };
  }, []);

  return null;
}
