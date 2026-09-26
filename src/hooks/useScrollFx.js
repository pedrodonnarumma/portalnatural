import { useEffect } from 'react';

// Single passive scroll listener + rAF for all scroll-driven effects.
// Writes CSS custom properties directly — no React re-renders.
export function useScrollFx() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function getCards() {
      return [...document.querySelectorAll('.pn-card-sec')];
    }

    function layout() {
      getCards().forEach((c) => {
        c.style.setProperty('--stick', `${Math.min(0, window.innerHeight - c.offsetHeight)}px`);
      });
    }

    let ticking = false;

    function frame() {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;

      const hdr = document.querySelector('.pn-header');
      if (hdr) {
        hdr.classList.toggle('is-scrolled', y > 12);
        hdr.style.setProperty('--prog', max > 0 ? (y / max).toFixed(4) : '0');
      }

      if (!reduced) {
        const heroImg = document.querySelector('.pn-hero-photo-img');
        if (heroImg && y < vh * 1.2) {
          heroImg.style.setProperty('--py', `${(y * 0.08).toFixed(1)}px`);
        }

        const cards = getCards();
        for (let i = 0; i < cards.length - 1; i++) {
          const nt = cards[i + 1].getBoundingClientRect().top;
          const p = Math.max(0, Math.min(1, (vh - nt) / vh));
          cards[i].style.setProperty('--p', p.toFixed(3));
        }

        const spoon = document.querySelector('.pn-spoons-d');
        if (spoon) {
          const r = spoon.getBoundingClientRect();
          if (r.bottom > -200 && r.top < vh + 200) {
            const c = r.top + r.height / 2 - vh / 2;
            spoon.style.setProperty('--sy', `${(-c * 0.09).toFixed(1)}px`);
          }
        }
      }

      // Scroll-spy: section at 45% viewport height
      const spies = [...document.querySelectorAll('[data-spy]')];
      let current = null;
      spies.forEach((a) => {
        const sec = document.getElementById(a.dataset.spy);
        if (sec) {
          const r = sec.getBoundingClientRect();
          if (r.top < vh * 0.45 && r.bottom > vh * 0.45) current = a;
        }
      });
      spies.forEach((a) => a.classList.toggle('is-active', a === current));
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }

    const ro = new ResizeObserver(() => { layout(); onScroll(); });
    document.querySelectorAll('.pn-card-sec').forEach((c) => ro.observe(c));

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { layout(); onScroll(); });
    layout();
    frame();

    if (reduced) {
      getCards().forEach((c) => c.style.removeProperty('--stick'));
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);
}
