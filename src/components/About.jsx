import { Check, SmallSprout } from './icons.jsx';

const puntos = ['Atención personalizada, sin apuro', 'Productos frescos con rotación semanal', 'Envases retornables y bolsas de papel'];

export default function About() {
  return (
    <section id="nosotros" className="pn-about">
      <div className="pn-about-illus pn-d" aria-hidden="true">
        <SmallSprout size={240} strokeWidth={1.1} style={{ opacity: 0.28, color: 'var(--pn-sprout)' }} />
      </div>
      <div className="pn-about-copy">
        <span className="pn-kicker">Sobre nosotros</span>
        <h2 className="pn-h2">
          <span className="pn-d">Una dietética pensada como <em>un lugar de encuentro</em></span>
          <span className="pn-m">Un lugar de <em>encuentro</em></span>
        </h2>
        <p className="pn-body pn-d">
          Portal Natural abre sus puertas este mes con una idea simple: que comer sano no tenga que ser complicado ni caro. Trabajamos con proveedores locales y seleccionamos cada partida antes de que llegue a la góndola.
        </p>
        <p className="pn-body pn-d">
          Nuestro local en Luján de Cuyo combina el mostrador de siempre con un espacio luminoso donde podés preguntar, probar y llevarte solo lo que necesitás.
        </p>
        <p className="pn-body pn-m">
          Portal Natural abre sus puertas este mes con una idea simple: que comer sano no sea complicado. Trabajamos con proveedores locales y revisamos cada partida antes de la góndola.
        </p>
        <ul className="pn-checklist pn-d">
          {puntos.map((p) => (
            <li key={p}><Check size={18} />{p}</li>
          ))}
        </ul>
        <div className="pn-about-illus-m pn-m" aria-hidden="true">
          <SmallSprout size={96} strokeWidth={1.1} style={{ opacity: 0.28 }} />
        </div>
      </div>
    </section>
  );
}
