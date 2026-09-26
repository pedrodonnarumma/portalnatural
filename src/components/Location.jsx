import { useEffect, useState } from 'react';
import { Clock, MapPin, Phone } from './icons.jsx';
import { site } from '../data/site.js';
import { estadoLocal } from '../lib/horario.js';

const COMO_LLEGAR = 'https://www.google.com/maps/dir/?api=1&destination=Azcu%C3%A9naga+22%2C+Luj%C3%A1n+de+Cuyo%2C+Mendoza';

function MapDesktop() {
  return (
    <svg className="pn-map-svg pn-d" viewBox="0 0 660 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="660" height="440" fill="var(--pn-map)" />
      {[[36, 40, 180, 120], [262, 40, 150, 120], [458, 40, 166, 120], [36, 206, 180, 96], [458, 206, 166, 96], [36, 348, 180, 70], [262, 348, 150, 70], [458, 348, 166, 70]].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="8" fill="var(--pn-map-block)" />
      ))}
      <rect x="262" y="206" width="150" height="96" rx="10" fill="var(--pn-map-park)" />
      <path d="M0 182h660" stroke="#fff" strokeWidth="22" />
      <path d="M0 324h660" stroke="#fff" strokeWidth="16" />
      <path d="M238 0v440" stroke="#fff" strokeWidth="20" />
      <path d="M434 0v440" stroke="#fff" strokeWidth="14" />
      <text x="272" y="246" fontFamily="DM Sans, sans-serif" fontSize="12" fill="#5f7a60">Plaza</text>
      <text x="250" y="130" fontFamily="DM Sans, sans-serif" fontSize="12" fill="#93a893" transform="rotate(-90 250 130)">Azcuénaga</text>
      <g className="pn-pin">
        <path d="M238 182c-13 0-23 10-23 23 0 17 23 37 23 37s23-20 23-37c0-13-10-23-23-23z" fill="var(--pn-accent)" />
        <circle cx="238" cy="205" r="8" fill="#fff" />
      </g>
    </svg>
  );
}

function MapMobile() {
  return (
    <svg className="pn-map-svg pn-m" viewBox="0 0 350 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="350" height="220" fill="var(--pn-map)" />
      {[[18, 20, 110, 62], [160, 20, 90, 62], [272, 20, 60, 62], [18, 128, 110, 70], [272, 128, 60, 70]].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="6" fill="var(--pn-map-block)" />
      ))}
      <rect x="160" y="128" width="90" height="70" rx="8" fill="var(--pn-map-park)" />
      <path d="M0 102h350" stroke="#fff" strokeWidth="16" />
      <path d="M144 0v220" stroke="#fff" strokeWidth="14" />
      <path d="M144 100c-10 0-18 8-18 18 0 13 18 29 18 29s18-16 18-29c0-10-8-18-18-18z" fill="var(--pn-accent)" />
      <circle cx="144" cy="118" r="6" fill="#fff" />
    </svg>
  );
}

export default function Location() {
  const [estado, setEstado] = useState(() => estadoLocal());
  const waLink = `https://wa.me/${site.whatsapp}`;

  useEffect(() => {
    const tick = () => setEstado(estadoLocal());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="ubicacion" className="pn-location pn-card-sec">
      <div className="pn-map" data-reveal>
        {site.mapaEmbed ? (
          <iframe
            src={site.mapaEmbed}
            title="Mapa de Portal Natural"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <>
            <MapDesktop />
            <MapMobile />
            <span className="pn-frame-label">Mapa de referencia</span>
          </>
        )}
        <a
          className="pn-map-directions"
          href={COMO_LLEGAR}
          target="_blank"
          rel="noopener noreferrer"
        >
          Cómo llegar
        </a>
      </div>
      <div className="pn-location-copy" data-reveal style={{ '--i': 1 }}>
        <span className="pn-kicker">Ubicación</span>
        <h2 className="pn-h2">Visitanos en el <em>local</em></h2>
        <ul className="pn-info">
          <li>
            <MapPin className="pn-info-icon" />
            <div>
              <span className="pn-info-title pn-d">{site.direccion}</span>
              <span className="pn-info-sub pn-d">{site.ciudad}</span>
              <span className="pn-info-title pn-m">{site.direccionCorta}</span>
            </div>
          </li>
          <li>
            <Clock className="pn-info-icon" />
            <div>
              <span className="pn-info-title">
                <span className="pn-d">{site.horarioSemana}</span>
                <span className="pn-m">{site.horarioSemanaCorto}</span>
              </span>
              <span className="pn-info-sub">
                <span className="pn-d">{site.horarioFinde}</span>
                <span className="pn-m">{site.horarioFindeCorto}</span>
              </span>
              <span className={`pn-open-status${estado.abierto ? '' : ' is-closed'}`} aria-live="polite">
                {estado.texto} · {estado.detalle}
              </span>
            </div>
          </li>
          <li className="pn-d">
            <Phone className="pn-info-icon" />
            <div>
              <a className="pn-info-title pn-info-link" href={waLink} target="_blank" rel="noopener noreferrer">
                {site.telefono}
              </a>
              <span className="pn-info-sub">También tomamos pedidos por mensaje</span>
            </div>
          </li>
        </ul>
        <a className="pn-btn pn-btn-primary pn-btn-lg pn-location-cta pn-d" href="#contacto">Escribinos</a>
      </div>
    </section>
  );
}
