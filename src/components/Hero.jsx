import { Leaf } from 'lucide-react';
import HeroBranches from './HeroBranches.jsx';
import Photo from './Photo.jsx';
import { fotos, site } from '../data/site.js';

export default function Hero() {
  return (
    <section id="inicio" className="container hero">
      <HeroBranches />
      <div className="hero-copy">
        <span className="tag tag-accent-2 hero-tag">
          <Leaf size={14} strokeWidth={2.75} aria-hidden="true" />
          Dietética de barrio
        </span>
        <h1 className="hero-title">
          <span>Comer bien,</span>
          <span className="text-accent">simple y natural</span>
        </h1>
        <p className="hero-lead">
          Semillas, frutos secos, harinas, suplementos y productos sin TACC. Seleccionamos cada partida a granel y
          envasada para que tu alimentación sea más consciente.
        </p>
        <div className="hero-actions">
          <a href="#catalogo" className="btn btn-primary btn-pill btn-lg">Explorar productos</a>
          <a href="#ubicacion" className="btn btn-secondary btn-pill btn-lg">Cómo llegar</a>
        </div>
        <dl className="hero-stats">
          <div className="stat">
            <dt className="stat-num text-accent-2">+50</dt>
            <dd className="stat-label">productos seleccionados</dd>
          </div>
          <div className="stat">
            <dt className="stat-num text-accent">100%</dt>
            <dd className="stat-label">a granel, sin envases de más</dd>
          </div>
        </dl>
      </div>
      <div className="hero-media">
        <div className="blob hero-blob-1" aria-hidden="true" />
        <div className="blob hero-blob-2" aria-hidden="true" />
        <Photo
          className="hero-photo"
          src={fotos.local}
          alt="El local de Portal Natural"
          placeholder="Foto del local / mostrador"
          ratio="5 / 6"
          eager
        />
        <div className="hero-badge">{site.abiertoHoy}</div>
      </div>
    </section>
  );
}
