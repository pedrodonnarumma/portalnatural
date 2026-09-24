import { Clock, MapPin, Phone } from 'lucide-react';
import Photo from './Photo.jsx';
import { fotos, site } from '../data/site.js';

const items = [
  { Icon: MapPin, title: site.direccion, sub: site.barrioCiudad },
  { Icon: Clock, title: site.horarioSemana, sub: site.horarioFinde },
  { Icon: Phone, title: site.telefono, sub: 'También tomamos pedidos por mensaje' },
];

export default function Location() {
  return (
    <section id="ubicacion" className="container split location">
      {site.mapaEmbed ? (
        <figure className="washed photo location-map">
          <iframe
            src={site.mapaEmbed}
            title="Mapa de Portal Natural"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </figure>
      ) : (
        <Photo
          className="location-map"
          src={fotos.mapa}
          alt="La cuadra de Portal Natural"
          placeholder="Mapa o foto de la cuadra"
          ratio="4 / 3"
        />
      )}
      <div>
        <span className="kicker">Ubicación</span>
        <h2 className="section-title location-title">
          Visitanos en el <span className="text-accent-2">local</span>
        </h2>
        <ul className="info-list">
          {items.map(({ Icon, title, sub }, i) => (
            <li key={sub}>
              <span className={`icon-circle icon-circle-38 ${i % 2 ? 'tone-accent' : 'tone-accent-2'}`}>
                <Icon size={18} strokeWidth={2.75} aria-hidden="true" />
              </span>
              <span>
                <strong>{title}</strong>
                <span className="info-sub">{sub}</span>
              </span>
            </li>
          ))}
        </ul>
        <a href="#contacto" className="btn btn-primary btn-pill btn-lg location-cta">Escribinos</a>
      </div>
    </section>
  );
}
