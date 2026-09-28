import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const PendientesCtx = createContext({ count: 0, refresh: () => {} });

export function PendientesProvider({ children }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const { count: c } = await supabase
      .from('ventas')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    setCount(c ?? 0);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <PendientesCtx.Provider value={{ count, refresh }}>
      {children}
    </PendientesCtx.Provider>
  );
}

export function usePendientes() {
  return useContext(PendientesCtx);
}
