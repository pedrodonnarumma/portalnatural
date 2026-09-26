import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Hero from '../components/Hero.jsx';
import Values from '../components/Values.jsx';
import About from '../components/About.jsx';
import Favorites from '../components/Favorites.jsx';
import Location from '../components/Location.jsx';
import Contact from '../components/Contact.jsx';
import Footer from '../components/Footer.jsx';
import { useScrollFx } from '../hooks/useScrollFx.js';
import { useReveal } from '../hooks/useReveal.js';

export default function Landing() {
  const { hash } = useLocation();

  // Add pn-js to <html> before paint so CSS can set initial hidden states.
  // Must run synchronously (not in useEffect) to avoid flash of visible then hidden.
  if (typeof document !== 'undefined') {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) document.documentElement.classList.add('pn-js');
  }

  useEffect(() => {
    document.title = 'Portal Natural — Dietética de barrio';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    // Two rAF frames ensure layout is complete before triggering CSS transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add('pn-loaded');
      });
    });
    return () => {
      document.documentElement.classList.remove('pn-js', 'pn-loaded');
    };
  }, []);

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }, [hash]);

  useScrollFx();
  useReveal();

  return (
    <div className="pn-page">
      <Nav variant="landing" />
      <main>
        <Hero />
        <Values />
        <div className="pn-deck">
          <Favorites />
          <About />
          <Location />
          <Contact />
        </div>
      </main>
      <Footer />
    </div>
  );
}
