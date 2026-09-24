// Edge Function: envía el mail de una promoción a los clientes que aceptan promociones.
//
// Modos:
//   { "promocion_id": "<uuid>" }                  → envía esa promo a todos los clientes con correo (llamado desde el panel).
//   { "promocion_id": "<uuid>", "test_email": "" } → envía solo una prueba a ese correo, sin registrar envíos.
//   { "auto": true }                              → (cron) envía todas las promos con enviar_auto, vigentes y no enviadas.
//
// Secrets necesarios (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   clave de https://resend.com
//   MAIL_FROM        remitente, p. ej. "Portal Natural <hola@tudominio.com>" (el dominio debe estar verificado en Resend)
//   MAIL_REPLY_TO    (opcional) correo al que responden los clientes
//   SITE_URL         (opcional) link al sitio en el pie del mail

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'Portal Natural <onboarding@resend.dev>';
const MAIL_REPLY_TO = Deno.env.get('MAIL_REPLY_TO') ?? undefined;
const SITE_URL = Deno.env.get('SITE_URL') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  // ── Autenticación: usuario del panel o service role (cron) ──
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sin autorización' }, 401);

  let isService = token === SERVICE_ROLE_KEY;
  if (!isService) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data.user) return json({ error: 'Sesión inválida' }, 401);
  }

  if (!RESEND_API_KEY) return json({ error: 'Falta configurar RESEND_API_KEY en los secrets de la función.' }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let body: { promocion_id?: string; test_email?: string; auto?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }

  try {
    if (body.auto) {
      if (!isService) return json({ error: 'El modo automático solo se ejecuta desde el cron.' }, 403);
      const today = new Date().toISOString().slice(0, 10);
      const { data: promos, error } = await admin
        .from('promociones')
        .select('id')
        .eq('activa', true)
        .eq('enviar_auto', true)
        .is('enviada_at', null)
        .lte('fecha_inicio', today)
        .or(`fecha_fin.is.null,fecha_fin.gte.${today}`);
      if (error) throw error;
      const results = [];
      for (const p of promos ?? []) results.push({ id: p.id, ...(await enviarPromocion(admin, p.id)) });
      return json({ ok: true, procesadas: results });
    }

    if (!body.promocion_id) return json({ error: 'Falta promocion_id' }, 400);
    const result = await enviarPromocion(admin, body.promocion_id, body.test_email?.trim() || undefined);
    return json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message ?? 'Error inesperado' }, 500);
  }
});

type Item = { precio_promo: number; producto: { nombre: string; precio: number; unidad: string } | null };

async function enviarPromocion(admin: SupabaseClient, promocionId: string, testEmail?: string) {
  const { data: promo, error: e1 } = await admin
    .from('promociones')
    .select('id, titulo, descripcion, fecha_inicio, fecha_fin, items:promocion_items(precio_promo, producto:productos(nombre, precio, unidad))')
    .eq('id', promocionId)
    .single();
  if (e1 || !promo) throw new Error('Promoción no encontrada');
  if (!promo.items?.length) throw new Error('La promoción no tiene productos');

  const html = renderHtml(promo as unknown as Promo);
  const subject = `🌿 ${promo.titulo}`;

  if (testEmail) {
    await sendBatch([{ to: testEmail, subject, html }]);
    return { enviados: 1, errores: 0, prueba: true };
  }

  const { data: clientes, error: e2 } = await admin
    .from('clientes')
    .select('id, nombre, email')
    .eq('acepta_promos', true)
    .not('email', 'is', null)
    .neq('email', '');
  if (e2) throw e2;

  // Un mail por dirección (evita duplicados si dos clientes comparten correo).
  const seen = new Set<string>();
  const destinos = (clientes ?? []).filter((c) => {
    const k = c.email!.trim().toLowerCase();
    if (!k.includes('@') || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (destinos.length === 0) throw new Error('No hay clientes con correo que acepten promociones');

  let enviados = 0;
  let errores = 0;
  const registros: { promocion_id: string; cliente_id: string; email: string; estado: string; detalle: string | null }[] = [];

  // Resend acepta hasta 100 mails por lote.
  for (let i = 0; i < destinos.length; i += 100) {
    const lote = destinos.slice(i, i + 100);
    try {
      await sendBatch(lote.map((c) => ({ to: c.email!.trim(), subject, html })));
      for (const c of lote) registros.push({ promocion_id: promocionId, cliente_id: c.id, email: c.email!, estado: 'enviado', detalle: null });
      enviados += lote.length;
    } catch (err) {
      const msg = (err as Error).message;
      for (const c of lote) registros.push({ promocion_id: promocionId, cliente_id: c.id, email: c.email!, estado: 'error', detalle: msg });
      errores += lote.length;
    }
  }

  await admin.from('envios_promocion').insert(registros);
  if (enviados > 0) await admin.from('promociones').update({ enviada_at: new Date().toISOString() }).eq('id', promocionId);
  return { enviados, errores };
}

async function sendBatch(mails: { to: string; subject: string; html: string }[]) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(mails.map((m) => ({ from: MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, ...(MAIL_REPLY_TO ? { reply_to: MAIL_REPLY_TO } : {}) }))),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
}

type Promo = { titulo: string; descripcion: string | null; fecha_inicio: string; fecha_fin: string | null; items: Item[] };

const money = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fecha = (d: string) => {
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

function renderHtml(p: Promo) {
  const vigencia = p.fecha_fin ? `Válido del ${fecha(p.fecha_inicio)} al ${fecha(p.fecha_fin)}.` : `Válido desde el ${fecha(p.fecha_inicio)}.`;
  const rows = p.items
    .filter((it) => it.producto)
    .map((it) => {
      const prod = it.producto!;
      const off = prod.precio > 0 ? Math.round((1 - it.precio_promo / prod.precio) * 100) : 0;
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #dcd3c4;font-size:16px;color:#201e1d">${esc(prod.nombre)} <span style="color:#82796a;font-size:13px">/ ${esc(prod.unidad)}</span></td>
          <td style="padding:12px 0;border-bottom:1px solid #dcd3c4;text-align:right;white-space:nowrap">
            ${prod.precio > it.precio_promo ? `<span style="color:#82796a;text-decoration:line-through;font-size:13px">${money(prod.precio)}</span> ` : ''}
            <strong style="color:#8c491a;font-size:17px">${money(it.precio_promo)}</strong>
            ${off > 0 ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;background:#e1eecc;color:#3d472b;font-size:12px;font-weight:700">-${off}%</span>` : ''}
          </td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(p.titulo)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f5ead8;font-family:Figtree,Helvetica,Arial,sans-serif;color:#201e1d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#f9f4ed;border-radius:24px;padding:32px 28px">
      <tr><td style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#56633f;padding-bottom:10px">Portal Natural · Promoción</td></tr>
      <tr><td style="font-size:28px;line-height:1.15;font-weight:700;padding-bottom:12px">${esc(p.titulo)}</td></tr>
      ${p.descripcion ? `<tr><td style="font-size:16px;line-height:1.55;color:#474238;padding-bottom:18px">${esc(p.descripcion).replace(/\n/g, '<br>')}</td></tr>` : ''}
      <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="font-size:13px;color:#82796a;padding-top:18px">${vigencia} Hasta agotar stock.</td></tr>
      ${SITE_URL ? `<tr><td style="padding-top:22px"><a href="${esc(SITE_URL)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#c67139;color:#f5ead8;text-decoration:none;font-weight:700">Ver el local</a></td></tr>` : ''}
    </table>
    <p style="max-width:560px;font-size:12px;color:#82796a;margin:18px 0 0">Recibís este correo porque sos cliente de Portal Natural. Si no querés recibir promociones, respondé este mail y te damos de baja.</p>
  </td></tr></table>
</body></html>`;
}
