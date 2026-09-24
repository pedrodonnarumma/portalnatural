import { Link } from 'react-router-dom';
import PhotoFrame from './PhotoFrame.jsx';
import { HeroSprout, SmallSprout, Sprout } from './icons.jsx';
import { fotos } from '../data/site.js';

export default function Hero() {
  return (
    <section id="inicio" className="pn-hero">
      <div className="pn-hero-copy">
        <span className="pn-tag">
          <Sprout size={14} strokeWidth={2} className="pn-d" />
          Dietética de barrio
        </span>
        <h1 className="pn-hero-title">
          Comer bien,<br />
          <em>simple y natural</em>
        </h1>
        <p className="pn-hero-lead">
          <span className="pn-d">Semillas, frutos secos, harinas, suplementos y productos sin TACC. Seleccionamos cada producto a granel y envasado para que tu alimentación sea más consciente.</span>
          <span className="pn-m">Semillas, frutos secos, harinas, suplementos y productos sin TACC, a granel y envasados.</span>
        </p>
        <div className="pn-hero-actions">
          <a className="pn-btn pn-btn-primary pn-btn-lg pn-d" href="#catalogo">Explorar productos</a>
          <Link className="pn-btn pn-btn-primary pn-btn-lg pn-m" to="/catalogo">Ver catálogo</Link>
          <a className="pn-btn pn-btn-ghost pn-btn-lg" href="#ubicacion">Cómo llegar</a>
        </div>
        <div className="pn-stat pn-d">
          <span className="pn-stat-num">+50</span>
          <span className="pn-stat-label">productos seleccionados</span>
        </div>
      </div>
      <PhotoFrame className="pn-hero-photo" src={fotos.local} alt="El local de Portal Natural" label="[Foto del local]">
        <span className="pn-d"><HeroSprout size={420} /></span>
        <span className="pn-m"><SmallSprout size={150} ground={false} strokeWidth={1.4} /></span>
      </PhotoFrame>
    </section>
  );
}
