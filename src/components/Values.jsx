import { useEffect } from 'react';
import { BagCheck, Chat, GlutenFree, Leaf } from './icons.jsx';

const values = [
  { Icon: Leaf, title: 'Productos naturales', text: 'Selección sin conservantes ni aditivos innecesarios.', short: 'Sin conservantes innecesarios.' },
  { Icon: BagCheck, title: 'Armá tu pedido', text: 'Lo dejamos preparado y lo retirás cuando quieras.', short: 'Lo retirás cuando quieras.' },
  { Icon: GlutenFree, title: 'Apto sin TACC', text: 'Línea celíaca identificada y separada en góndola.', short: 'Línea celíaca identificada.' },
  { Icon: Chat, title: 'Asesoramiento', text: 'Te ayudamos a elegir según lo que necesitás.', short: 'Te ayudamos a elegir.' },
];

export default function Values() {
  useEffect(() => {
    // Set real stroke length for each path/circle so CSS can animate dashoffset
    document.querySelectorAll('.pn-draw path, .pn-draw circle').forEach((el) => {
      try { el.style.setProperty('--len', Math.ceil(el.getTotalLength() + 2)); } catch {}
    });
  }, []);

  return (
    <section className="pn-values" aria-label="Por qué elegirnos">
      <div className="pn-values-grid">
        {values.map(({ Icon, title, text, short }, i) => (
          <div key={title} className="pn-value" data-reveal style={{ '--i': i }}>
            <Icon className="pn-value-icon pn-draw" style={{ '--i': i }} />
            <h3 className="pn-value-title">{title}</h3>
            <p className="pn-value-text">
              <span className="pn-d">{text}</span>
              <span className="pn-m">{short}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
