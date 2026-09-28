import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { IconType } from 'react-icons';

export interface OpcionMenu {
  clave: string;
  etiqueta: string;
  Icono: IconType;
  /** Resalta en rojo las acciones destructivas. */
  peligrosa?: boolean;
  separadorAntes?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  opciones: OpcionMenu[];
  onSeleccionar: (clave: string) => void;
  onCerrar: () => void;
}

const ANCHO_MENU = 208;
const ALTO_OPCION = 38;

/**
 * Menú contextual flotante.
 * Se reposiciona solo si no cabe hacia abajo o hacia la derecha, para que no
 * quede recortado al hacer clic derecho cerca del borde de la ventana.
 */
export const ContextMenu = ({ x, y, opciones, onSeleccionar, onCerrar }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Derivada del clic, no estado: así el menú aparece ya colocado, sin el salto
  // de pintarse primero en el borde y recolocarse después.
  const posicion = useMemo(() => {
    const alto = opciones.length * ALTO_OPCION + 16;
    return {
      x: Math.min(x, window.innerWidth - ANCHO_MENU - 8),
      y: Math.min(y, window.innerHeight - alto - 8),
    };
  }, [x, y, opciones.length]);

  useEffect(() => {
    const cerrarSiFuera = (evento: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(evento.target as Node)) {
        onCerrar();
      }
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar();
    };

    document.addEventListener('mousedown', cerrarSiFuera);
    document.addEventListener('keydown', cerrarConEscape);
    window.addEventListener('resize', onCerrar);

    return () => {
      document.removeEventListener('mousedown', cerrarSiFuera);
      document.removeEventListener('keydown', cerrarConEscape);
      window.removeEventListener('resize', onCerrar);
    };
  }, [onCerrar]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: posicion.y, left: posicion.x, width: ANCHO_MENU }}
      className="fixed z-[90] overflow-hidden rounded-xl border border-white/40 backdrop-blur-2xl bg-white/70 py-1.5 shadow-2xl"
    >
      {opciones.map((opcion) => (
        <div key={opcion.clave}>
          {opcion.separadorAntes && <div className="my-1 h-px bg-gray-300/50" />}
          <button
            type="button"
            onClick={() => {
              onSeleccionar(opcion.clave);
              onCerrar();
            }}
            className={`flex w-full cursor-pointer select-none items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors ${
              opcion.peligrosa
                ? 'text-red-700 hover:bg-red-50/80'
                : 'text-gray-800 hover:bg-blue-50/80'
            }`}
          >
            <opcion.Icono className="h-4 w-4 flex-shrink-0" />
            {opcion.etiqueta}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
};
