import { Ban, Leaf, MessageSquare, ShoppingBag } from 'lucide-react';

const features = [
  { Icon: Leaf, title: 'Productos naturales', text: 'Selección sin conservantes ni aditivos innecesarios.' },
  { Icon: ShoppingBag, title: 'Armá tu pedido', text: 'Lo dejamos preparado y lo retirás cuando quieras.' },
  { Icon: Ban, title: 'Apto sin TACC', text: 'Línea celíaca identificada y separada en góndola.' },
  { Icon: MessageSquare, title: 'Asesoramiento', text: 'Te ayudamos a elegir según lo que necesitás.' },
];

export default function Features() {
  return (
    <section className="features">
      <div className="container features-grid">
        {features.map(({ Icon, title, text }, i) => (
          <div key={title}>
            <span className={`icon-circle icon-circle-40 ${i % 2 ? 'tone-accent' : 'tone-accent-2'}`}>
              <Icon size={20} strokeWidth={2.75} aria-hidden="true" />
            </span>
            <h3 className="feature-title">{title}</h3>
            <p className="feature-text">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
