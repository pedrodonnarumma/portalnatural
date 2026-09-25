import { useState } from 'react';
import { WhatsApp } from './icons.jsx';
import { site } from '../data/site.js';

export default function Contact() {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    const texto = value.trim();
    if (!texto) {
      setError('Contanos qué estás buscando antes de enviar.');
      return;
    }
    setError(null);
    const msg = `¡Hola, Portal Natural! Quería consultar: ${texto}`;
    window.open(`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    setSent(true);
    setValue('');
    setTimeout(() => setSent(false), 4000);
  }

  return (
    <section id="contacto" className="pn-contact">
      <div className="pn-contact-inner">
        <div className="pn-contact-copy">
          <h2 className="pn-h2 pn-contact-title">¿Buscás algo <em>en particular</em>?</h2>
          <p className="pn-contact-text">
            <span className="pn-d">Escribinos y te decimos si lo tenemos, cuánto sale y te lo dejamos reservado hasta que pases.</span>
            <span className="pn-m">Escribinos y te lo reservamos hasta que pases.</span>
          </p>
        </div>
        <form className="pn-contact-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="pn-consulta">¿Qué estás buscando?</label>
          <textarea
            id="pn-consulta"
            className="pn-contact-input pn-contact-textarea"
            placeholder="Ej.: harina de almendras, ¿tienen?"
            value={value}
            rows={3}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
              if (sent) setSent(false);
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'pn-consulta-error' : undefined}
          />
          {error && <p id="pn-consulta-error" className="pn-contact-error" role="alert">{error}</p>}
          {sent && <p className="pn-contact-sent" role="status">¡Se abrió WhatsApp! Te respondemos hoy.</p>}
          <button type="submit" className="pn-contact-submit pn-contact-submit-wa">
            <WhatsApp size={18} strokeWidth={1.8} />
            Consultar por WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}
