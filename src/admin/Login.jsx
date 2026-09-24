import { useState } from 'react';
import Brand from '../components/Brand.jsx';
import { supabase } from '../lib/supabase.js';
import { ErrorBox } from './components/ui.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message);
    setBusy(false);
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit}>
        <Brand size="md" />
        <div>
          <h2 className="login-title">Panel de gestión</h2>
          <p className="text-muted login-sub">Ingresá con tu usuario del local.</p>
        </div>
        <div className="field admin-field">
          <label htmlFor="login-email">Correo</label>
          <input id="login-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <div className="field admin-field">
          <label htmlFor="login-pass">Contraseña</label>
          <input id="login-pass" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <ErrorBox error={error} />
        <button type="submit" className="btn btn-primary btn-md btn-block" disabled={busy}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
