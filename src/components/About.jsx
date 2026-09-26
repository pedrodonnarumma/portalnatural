import { Check } from './icons.jsx';
import { fotos } from '../data/site.js';

const puntos = ['Atención personalizada, sin apuro', 'Productos frescos con rotación semanal', 'Envases retornables y bolsas de papel'];

export default function About() {
  return (
    <section id="nosotros" className="pn-about pn-card-sec">
      {/* Escritorio: cucharas absolutas con parallax via --sy */}
      {fotos.cucharas && (
        <img
          className="pn-spoons-d pn-d"
          src={fotos.cucharas}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={300}
          height={400}
        />
      )}
      <div className="pn-about-copy" data-reveal>
        <span className="pn-kicker">Sobre nosotros</span>
        <h2 className="pn-h2">
          <span className="pn-d">Una dietética pensada como <em>un lugar de encuentro</em></span>
          <span className="pn-m">Un lugar de <em>encuentro</em></span>
        </h2>
        <div className="pn-about-text">
          {/* Móvil: cucharas flotan dentro del primer párrafo con shape-outside */}
          {fotos.cucharas && (
            <img
              className="pn-spoons-m pn-m"
              src={fotos.cucharas}
              alt=""
              aria-hidden="true"
              width={170}
              height={227}
            />
          )}
          <p className="pn-body pn-d">
            Portal Natural abre sus puertas este mes con una idea simple: que comer sano no tenga que ser complicado ni caro. Trabajamos con proveedores locales y seleccionamos cada partida antes de que llegue a la góndola.
          </p>
          <p className="pn-body pn-d">
            Nuestro local en Luján de Cuyo combina el mostrador de siempre con un espacio luminoso donde podés preguntar, probar y llevarte solo lo que necesitás.
          </p>
          <p className="pn-body pn-m">
            Portal Natural abre sus puertas este mes con una idea simple: que comer sano no sea complicado. Trabajamos con proveedores locales y revisamos cada partida antes de la góndola.
          </p>
        </div>
        <ul className="pn-checklist pn-d">
          {puntos.map((p) => (
            <li key={p}><Check size={18} />{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
