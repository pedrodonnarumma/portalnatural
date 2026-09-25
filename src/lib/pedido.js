import { useCallback, useEffect, useState } from 'react';
import { fmtPrecio } from './format.js';
import { etiquetaCantidad, etiquetaPresentacion, precioPresentacion } from './precios.js';
import { site } from '../data/site.js';

const KEY = 'pn-pedido';
const KEY_CONTACTO = 'pn-contacto';

function leer() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (v && typeof v === 'object' && Object.values(v).every((x) => typeof x === 'number')) return v;
    return {};
  } catch {
    return {};
  }
}

export function leerContacto() {
  try { return JSON.parse(localStorage.getItem(KEY_CONTACTO) || '{}'); } catch { return {}; }
}

export function guardarContacto(nombre, telefono) {
  try { localStorage.setItem(KEY_CONTACTO, JSON.stringify({ nombre, telefono })); } catch {}
}

// Pedido = { [nombre]: pasos }. Un "paso" es venta_por de la unidad base.
export function usePedido() {
  const [qty, setQty] = useState(leer);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(qty));
    } catch {
      /* sin almacenamiento: el pedido vive solo en memoria */
    }
  }, [qty]);

  const sumar = useCallback((nombre, delta) => {
    setQty((q) => {
      const next = { ...q };
      const n = (next[nombre] || 0) + delta;
      if (n > 0) next[nombre] = n;
      else delete next[nombre];
      return next;
    });
  }, []);

  const quitar = useCallback((nombre) => {
    setQty((q) => {
      const next = { ...q };
      delete next[nombre];
      return next;
    });
  }, []);

  const vaciar = useCallback(() => setQty({}), []);

  return { qty, sumar, quitar, vaciar };
}

// Mensaje para el flujo de confirmación web (post-RPC).
export function mensajeWhatsAppConfirmado(nombre, numero, items, total) {
  const lineas = items.map((it) => {
    const vp = it.venta_por ?? 1;
    const cantLabel = etiquetaCantidad(it.pasos, it.unidad, vp);
    const precLabel = `${fmtPrecio(precioPresentacion(it.precio, vp))} / ${etiquetaPresentacion(it.unidad, vp)}`;
    if (it.unidad === 'un') {
      return `• ${cantLabel} de ${it.nombre} — ${fmtPrecio(it.subtotal)}`;
    }
    return `• ${cantLabel} de ${it.nombre} — ${fmtPrecio(it.subtotal)} (${precLabel})`;
  });
  return [
    `¡Hola, Portal Natural! Soy ${nombre}. Pedido #${numero}:`,
    '',
    ...lineas,
    '',
    `Total estimado: ${fmtPrecio(total)}`,
    '¿Me confirman el retiro? ¡Gracias!',
  ].join('\n');
}

// Mensaje fallback (sin Supabase configurado).
export function mensajeWhatsApp(items, total) {
  const lineas = items.map((it) => {
    const vp = it.venta_por ?? 1;
    const cantLabel = etiquetaCantidad(it.pasos, it.unidad, vp);
    const precLabel = `${fmtPrecio(precioPresentacion(it.precio, vp))} / ${etiquetaPresentacion(it.unidad, vp)}`;
    if (it.unidad === 'un') {
      return `• ${cantLabel} de ${it.nombre} — ${fmtPrecio(it.subtotal)}`;
    }
    return `• ${cantLabel} de ${it.nombre} — ${fmtPrecio(it.subtotal)} (${precLabel})`;
  });
  return [
    '¡Hola, Portal Natural! Quiero hacer este pedido:',
    '',
    ...lineas,
    '',
    `Total estimado: ${fmtPrecio(total)}`,
    '¿Me confirman disponibilidad y cuándo lo puedo retirar? ¡Gracias!',
  ].join('\n');
}

export function linkWhatsApp(texto) {
  const numero = (site.whatsapp || '').replace(/\D/g, '');
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
