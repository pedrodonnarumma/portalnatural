import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast } from '../components/ui.jsx';

export async function marcarVentaPagada(ventaId, medioPago) {
  return supabase.rpc('marcar_venta_pagada', {
    p_venta_id: ventaId,
    p_medio_pago: medioPago,
  });
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Hook compartido entre NuevaVenta (modal completo) y VentaRapidaSheet.
 * Maneja carga de productos/clientes, carrito, y submit a registrar_venta.
 * submit() retorna { numero, estado } en éxito o null si falló.
 */
export function useVentaForm() {
  const toast = useToast();
  const [productos, setProductos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [medio, setMedio] = useState('efectivo');
  const [estadoVenta, setEstadoVenta] = useState('pagada');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id, nombre, categoria, unidad, venta_por, precio, stock').eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('precios_promo_vigentes').select('producto_id, precio_promo'),
    ]).then(([p, c, pr]) => {
      if (p.error) { setError(p.error); return; }
      const promos = new Map((pr.data ?? []).map((x) => [x.producto_id, Number(x.precio_promo)]));
      setProductos(
        (p.data ?? []).map((x) => ({
          ...x,
          venta_por: Number(x.venta_por) || 1,
          precio_lista: Number(x.precio),
          precio: promos.has(x.id) ? promos.get(x.id) : Number(x.precio),
          promo: promos.has(x.id),
        }))
      );
      setClientes(c.data ?? []);
    });
  }, []);

  const results = useMemo(() => {
    if (!productos) return [];
    const s = q.trim().toLowerCase();
    const list = s
      ? productos.filter((p) => [p.nombre, p.categoria].some((v) => v?.toLowerCase().includes(s)))
      : productos;
    return list.slice(0, 12);
  }, [productos, q]);

  function add(p) {
    setItems((list) => {
      const i = list.findIndex((x) => x.producto_id === p.id);
      const step = p.venta_por ?? 1;
      if (i >= 0) return list.map((x, j) => (j === i ? { ...x, cantidad: round3(Number(x.cantidad) + step) } : x));
      return [
        ...list,
        {
          producto_id: p.id,
          nombre: p.nombre,
          unidad: p.unidad,
          venta_por: step,
          stock: Number(p.stock),
          cantidad: step,
          precio_unitario: Number(p.precio),
          promo: p.promo,
        },
      ];
    });
    setQ('');
  }

  const update = (i, k, v) => setItems((list) => list.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const remove = (i) => setItems((list) => list.filter((_, j) => j !== i));

  const total = items.reduce((a, x) => a + (Number(x.cantidad) || 0) * (Number(x.precio_unitario) || 0), 0);
  const valid = items.length > 0 && items.every((x) => Number(x.cantidad) > 0 && Number(x.precio_unitario) >= 0);

  // estadoOverride permite pasar el estado en el momento del submit sin
  // depender de la actualización de React (evita problemas de batching).
  async function submit(estadoOverride) {
    if (!valid) return null;
    const estadoFinal = estadoOverride ?? estadoVenta;
    setBusy(true);
    const { data, error: err } = await supabase.rpc('registrar_venta', {
      p_items: items.map((x) => ({
        producto_id: x.producto_id,
        cantidad: Number(x.cantidad),
        precio_unitario: Number(x.precio_unitario),
      })),
      p_cliente_id: clienteId || null,
      p_medio_pago: estadoFinal === 'pendiente' ? 'efectivo' : medio,
      p_notas: notas.trim() || null,
      p_estado: estadoFinal,
      p_direccion_envio: direccion.trim() || null,
    });
    setBusy(false);
    if (err) {
      toast(err.message, 'error');
      return null;
    }
    const { data: v } = await supabase.from('ventas').select('numero').eq('id', data).single();
    return { numero: v?.numero ?? '', estado: estadoFinal };
  }

  return {
    productos, clientes,
    q, setQ, results,
    items, add, update, remove,
    clienteId, setClienteId,
    medio, setMedio,
    estadoVenta, setEstadoVenta,
    direccion, setDireccion,
    notas, setNotas,
    total, valid, busy, error,
    submit,
  };
}
