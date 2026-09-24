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

export default function Landing() {
  const { hash } = useLocation();
  // Al llegar desde /catalogo con un ancla (/#nosotros), bajar a esa sección.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView());
  }, [hash]);

  useEffect(() => {
    document.title = 'Portal Natural — Dietética de barrio';
  }, []);

  return (
    <div className="pn-page">
      <Nav variant="landing" />
      <main>
        <Hero />
        <Values />
        <About />
        <Favorites />
        <Location />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
