import { useState } from 'react';
import { sendContacto, validateContacto } from '../lib/contact.js';

export default function Contact() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | sent | error
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const invalid = validateContacto(value);
    if (invalid) {
      setError(invalid);
      setStatus('error');
      return;
    }
    setError(null);
    setStatus('loading');
    try {
      await sendContacto(value);
      setValue('');
      setStatus('sent');
    } catch {
      setError('No pudimos enviar la consulta. Probá de nuevo en un rato.');
      setStatus('error');
    }
  }

  const label = status === 'loading' ? 'Enviando…' : status === 'sent' ? '¡Gracias! Te respondemos hoy' : 'Enviar consulta';

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
          <label htmlFor="pn-email">Tu correo o teléfono</label>
          <input
            id="pn-email"
            className="pn-contact-input"
            type="text"
            inputMode="email"
            autoComplete="email"
            placeholder="hola@correo.com"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status === 'error' || status === 'sent') {
                setStatus('idle');
                setError(null);
              }
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'pn-email-error' : undefined}
            required
          />
          {error && <p id="pn-email-error" className="pn-contact-error" role="alert">{error}</p>}
          <button type="submit" className="pn-contact-submit" disabled={status === 'loading'} aria-live="polite">
            {label}
          </button>
        </form>
      </div>
    </section>
  );
}
