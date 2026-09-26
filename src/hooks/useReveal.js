import { useEffect } from 'react';

// Adds class 'in' once each [data-reveal] element enters viewport.
// Uses a MutationObserver to pick up elements inserted after mount
// (e.g. products loaded from Supabase, "Ver más" rows, filter changes).
export function useReveal() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasIO = 'IntersectionObserver' in window;
    const hasMO = 'MutationObserver' in window;

    // ── Reduced motion / no IO: reveal immediately, including future inserts ──
    if (reduced || !hasIO) {
      document.querySelectorAll('[data-reveal]').forEach((t) => t.classList.add('in'));
      if (!hasMO) return;
      const mo = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.matches('[data-reveal]')) n.classList.add('in');
            n.querySelectorAll('[data-reveal]').forEach((t) => t.classList.add('in'));
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    // ── Normal path ──
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );

    // Per-element safety timer: if an element is still hidden 1.8 s after being
    // observed and is already in the viewport, reveal it unconditionally.
    const timers = new Map();

    function observe(el) {
      if (el.classList.contains('in')) return;
      io.observe(el);
      const t = setTimeout(() => {
        timers.delete(el);
        if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('in');
        }
      }, 1800);
      timers.set(el, t);
    }

    // Observe everything already in the DOM
    document.querySelectorAll('[data-reveal]').forEach(observe);

    // Watch for elements added later (Supabase data, "Ver más", filter re-renders)
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const candidates = [
            ...(n.matches('[data-reveal]') ? [n] : []),
            ...n.querySelectorAll('[data-reveal]'),
          ];
          candidates.forEach((el) => {
            if (el.classList.contains('in')) return;
            // Already in viewport at insert time → animate in on next frame
            // (rAF ensures the browser has rendered the initial hidden state first)
            if (el.getBoundingClientRect().top < window.innerHeight) {
              requestAnimationFrame(() => {
                if (!el.classList.contains('in')) el.classList.add('in');
              });
            } else {
              observe(el);
            }
          });
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);
}
