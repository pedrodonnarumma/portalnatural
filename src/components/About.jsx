import { Check } from 'lucide-react';
import Photo from './Photo.jsx';
import { fotos } from '../data/site.js';

const puntos = [
  'Atención personalizada, sin apuro',
  'Productos frescos con rotación semanal',
  'Envases retornables y bolsas de papel',
];

export default function About() {
  return (
    <section id="nosotros" className="container split about">
      <div className="about-media">
        <div className="blob about-blob" aria-hidden="true" />
        <Photo
          className="about-photo"
          src={fotos.equipo}
          alt="El equipo de Portal Natural"
          placeholder="Foto del equipo"
          ratio="4 / 5"
        />
      </div>
      <div>
        <span className="kicker">Sobre nosotros</span>
        <h2 className="section-title">
          Una dietética pensada como <span className="text-accent-2">un lugar de encuentro</span>
        </h2>
        <p className="body-text">
          Portal Natural abre sus puertas con una idea simple: que comer sano no tenga que ser complicado ni caro.
          Trabajamos con proveedores locales y seleccionamos cada partida antes de que llegue a la góndola.
        </p>
        <p className="body-text">
          Nuestro local combina el mostrador de siempre con un espacio luminoso donde podés preguntar, probar y llevarte
          solo lo que necesitás.
        </p>
        <ul className="checklist">
          {puntos.map((p) => (
            <li key={p}>
              <Check size={20} strokeWidth={2.75} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
