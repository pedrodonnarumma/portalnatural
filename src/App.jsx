import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import Features from './components/Features.jsx';
import About from './components/About.jsx';
import Vidriera from './components/Vidriera.jsx';
import Location from './components/Location.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <div className="page">
      <Nav />
      <main>
        <Hero />
        <Features />
        <About />
        <Vidriera />
        <Location />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
