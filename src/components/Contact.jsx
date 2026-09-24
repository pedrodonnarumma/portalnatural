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

  const label =
    status === 'loading' ? 'Enviando…' : status === 'sent' ? '¡Gracias! Te respondemos hoy' : 'Enviar consulta';

  return (
    <section id="contacto" className="container contact">
      <div className="contact-panel">
        <div className="contact-blob" aria-hidden="true" />
        <div className="contact-copy">
          <h2 className="section-title contact-title">
            ¿Buscás algo <span className="contact-highlight">en particular</span>?
          </h2>
          <p className="contact-text">
            Escribinos y te decimos si lo tenemos, cuánto sale y te lo dejamos reservado hasta que pases.
          </p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="pn-mail">Tu correo o teléfono</label>
          <input
            id="pn-mail"
            className="input contact-input"
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
            aria-describedby={error ? 'pn-mail-error' : undefined}
            required
          />
          {error && (
            <p id="pn-mail-error" className="contact-error" role="alert">{error}</p>
          )}
          <button type="submit" className="btn contact-submit" disabled={status === 'loading'} aria-live="polite">
            {label}
          </button>
        </form>
      </div>
    </section>
  );
}
