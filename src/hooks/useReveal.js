import { useEffect } from 'react';

// Adds class 'in' once each [data-reveal] element enters viewport.
// Hidden state is only applied when JS adds 'pn-js' to <html>.
export function useReveal() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (reduced) {
      targets.forEach((t) => t.classList.add('in'));
      return;
    }

    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    targets.forEach((t) => io.observe(t));

    const timer = setTimeout(() => {
      targets.forEach((t) => {
        if (t.getBoundingClientRect().top < window.innerHeight) t.classList.add('in');
      });
    }, 1800);

    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);
}
