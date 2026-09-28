import { useCallback, useSyncExternalStore } from 'react';

/**
 * Sigue una media query de CSS desde React.
 *
 * Se usa para las decisiones que no se pueden resolver solo con clases de
 * Tailwind (qué hace la hamburguesa, si una columna del kanban se puede
 * arrastrar por su cabecera…). En el primer render, cuando todavía no hay
 * `window`, devuelve `valorInicial`.
 */
export const useMediaQuery = (consulta: string, valorInicial = false): boolean => {
  const suscribir = useCallback(
    (avisar: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const lista = window.matchMedia(consulta);
      lista.addEventListener('change', avisar);
      return () => lista.removeEventListener('change', avisar);
    },
    [consulta],
  );

  const leer = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return valorInicial;
    return window.matchMedia(consulta).matches;
  }, [consulta, valorInicial]);

  // `useSyncExternalStore` es justo la herramienta para esto: la media query es
  // un almacen externo al arbol de React. Ademas del efecto que sobra, evita el
  // parpadeo de un primer render con el valor equivocado.
  return useSyncExternalStore(suscribir, leer, () => valorInicial);
};

/** Punto de corte `lg` de Tailwind: a partir de aquí hay sitio para el menú fijo. */
export const useIsDesktop = (): boolean => useMediaQuery('(min-width: 1024px)', true);
