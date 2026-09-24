const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s()-]{8,}$/;

export function validateContacto(value) {
  const v = value.trim();
  if (!v) return 'Dejanos tu correo o teléfono.';
  if (!EMAIL_RE.test(v) && !PHONE_RE.test(v)) return 'Revisá el dato: tiene que ser un correo o un teléfono válido.';
  return null;
}

export async function sendContacto(contacto) {
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT;
  if (!endpoint) {
    // Sin endpoint configurado: simulamos el envío.
    await new Promise((r) => setTimeout(r, 700));
    return;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacto: contacto.trim() }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
