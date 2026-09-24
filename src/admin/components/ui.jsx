import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';

/* ───────── Toasts ───────── */
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ───────── Modal ───────── */
export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="dialog-backdrop admin-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog admin-dialog ${wide ? 'admin-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-dialog-head">
          <h3 className="dialog-title">{title}</h3>
          <button type="button" className="btn btn-icon btn-secondary" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ───────── Confirm ───────── */
export function Confirm({ title, text, confirmLabel = 'Confirmar', danger = false, onConfirm, onClose, busy = false }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="dialog-body">{text}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy ? 'Un momento…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ───────── Form helpers ───────── */
export function Field({ label, children, hint, span }) {
  return (
    <div className={`field admin-field ${span ? 'span-2' : ''}`}>
      <label>{label}</label>
      {children}
      {hint && <small className="admin-hint">{hint}</small>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Buscar…' }) {
  return (
    <div className="searchbox">
      <Search size={16} aria-hidden="true" />
      <input className="input" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

export function Spinner({ label = 'Cargando…' }) {
  return <div className="empty text-muted">{label}</div>;
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="admin-error" role="alert">{typeof error === 'string' ? error : error.message}</div>;
}

/* ───────── Page shell ───────── */
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* Autofocus helper para inputs dentro de modales. */
export function useAutoFocus() {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
