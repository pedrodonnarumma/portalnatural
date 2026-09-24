import { useCallback, useEffect, useState } from 'react';
import { fmtPrecio } from './format.js';
import { site } from '../data/site.js';

const KEY = 'pn-pedido';

function leer() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// Pedido = { [nombre]: cantidad }. Se guarda en el navegador para no perderlo al recargar.
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

export function mensajeWhatsApp(items, total) {
  const lineas = items.map((it) => `• ${it.cantidad} × ${it.nombre} (${it.unidad}) — ${fmtPrecio(it.subtotal)}`);
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
