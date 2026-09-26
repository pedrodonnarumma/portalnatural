import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fotos } from '../data/site.js';
import { estadoLocal } from '../lib/horario.js';
import { Sprout } from './icons.jsx';

function OpenChip() {
  const [estado, setEstado] = useState(() => estadoLocal());

  useEffect(() => {
    const tick = () => setEstado(estadoLocal());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`pn-open-chip${estado.abierto ? '' : ' is-closed'}`} aria-live="polite">
      <span className="pn-open-dot" aria-hidden="true" />
      {estado.texto}
      <small>· {estado.detalle}</small>
    </span>
  );
}

export default function Hero() {
  const statRef = useRef(null);

  useEffect(() => {
    const stat = statRef.current;
    if (!stat) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { stat.textContent = '+50'; return; }

    let rafId;
    function start(ts0) {
      function frame(ts) {
        const k = Math.min(1, (ts - ts0) / 1400);
        const e = 1 - Math.pow(1 - k, 3);
        stat.textContent = '+' + Math.round(e * 50);
        if (k < 1) rafId = requestAnimationFrame(frame);
      }
      stat.textContent = '+0';
      rafId = requestAnimationFrame(frame);
    }
    const timer = setTimeout(() => start(performance.now()), 700);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafId); };
  }, []);

  return (
    <section id="inicio" className="pn-hero">
      <div className="pn-hero-copy">
        <span className="pn-tag pn-rise" style={{ '--d': '100' }}>
          <Sprout size={14} strokeWidth={2} className="pn-d" />
          Dietética de barrio
        </span>
        <h1 className="pn-hero-title">
          <span className="pn-h1-ln"><span style={{ '--d': '220' }}>Tu bienestar,</span></span>
          <span className="pn-h1-ln"><span style={{ '--d': '340' }}><em>nuestra esencia.</em></span></span>
        </h1>
        <p className="pn-hero-lead pn-rise" style={{ '--d': '520' }}>
          <span className="pn-d">Semillas, frutos secos, harinas, suplementos y productos sin TACC. Seleccionamos cada producto a granel y envasado para que tu alimentación sea más consciente.</span>
          <span className="pn-m">Semillas, frutos secos, harinas, suplementos y productos sin TACC, a granel y envasados.</span>
        </p>
        <div className="pn-hero-actions pn-rise" style={{ '--d': '640' }}>
          <a className="pn-btn pn-btn-primary pn-btn-lg pn-d" href="#catalogo">Explorar productos</a>
          <Link className="pn-btn pn-btn-primary pn-btn-lg pn-m" to="/catalogo">Ver catálogo</Link>
          <a className="pn-btn pn-btn-ghost pn-btn-lg" href="#ubicacion">Cómo llegar</a>
        </div>
        <div className="pn-stat pn-d pn-rise" style={{ '--d': '760' }}>
          <span ref={statRef} className="pn-stat-num">+50</span>
          <span className="pn-stat-label">productos seleccionados</span>
        </div>
      </div>

      <div className="pn-hero-photo">
        {fotos.local && (
          <img
            className="pn-hero-photo-img"
            src={fotos.local}
            alt="Interior del local Portal Natural en Luján de Cuyo"
            width={640}
            height={525}
            loading="eager"
            fetchPriority="high"
          />
        )}
        <OpenChip />
      </div>
    </section>
  );
}
