import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface SidebarContextType {
  /** Menú reducido al carril de iconos. Solo aplica en escritorio. */
  isCollapsed: boolean;
  /** Menú abierto como cajón superpuesto. Solo aplica en móvil y tableta. */
  isMobileOpen: boolean;
  /** Alterna lo que corresponda al ancho actual: el cajón o el carril. */
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

/** Clave del navegador donde se recuerda el menú contraído entre recargas. */
const CLAVE_ALMACEN = 'crmia.sidebar.collapsed';

/** Ancho a partir del cual el menú cabe fijo al lado del contenido (`lg`). */
const ANCHO_ESCRITORIO = 1024;

const esEscritorio = (): boolean =>
  typeof window === 'undefined' || window.innerWidth >= ANCHO_ESCRITORIO;

/**
 * Estado inicial del menú: lo que la persona usuaria dejó la última vez y, si nunca lo
 * ha tocado, contraído por debajo de `lg` para no comerse la pantalla.
 */
const leerEstadoInicial = (): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    const guardado = window.localStorage.getItem(CLAVE_ALMACEN);
    if (guardado === 'true') return true;
    if (guardado === 'false') return false;
  } catch {
    // Navegación privada o almacenamiento bloqueado: se usa el valor por ancho.
  }

  return !esEscritorio();
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(leerEstadoInicial);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // La preferencia se recuerda entre recargas: antes cada F5 devolvía el menú
  // a 256 px y en un móvil dejaba el contenido en 134 px.
  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE_ALMACEN, String(isCollapsed));
    } catch {
      // Si no se puede guardar, el menú simplemente no recuerda el estado.
    }
  }, [isCollapsed]);

  // El cajón es exclusivo del móvil: al ensanchar la ventana debe desaparecer,
  // porque a partir de `lg` el menú ya se ve fijo al lado del contenido.
  useEffect(() => {
    const alRedimensionar = () => {
      if (esEscritorio()) setIsMobileOpen(false);
    };

    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, []);

  const collapseSidebar = useCallback(() => setIsCollapsed(true), []);
  const expandSidebar = useCallback(() => setIsCollapsed(false), []);
  const openMobileSidebar = useCallback(() => setIsMobileOpen(true), []);
  const closeMobileSidebar = useCallback(() => setIsMobileOpen(false), []);

  /**
   * En escritorio alterna el carril de iconos; en móvil abre y cierra el cajón.
   * Es el mismo botón (la hamburguesa) con el significado que toca en cada ancho.
   */
  const toggleSidebar = useCallback(() => {
    if (esEscritorio()) setIsCollapsed((previo) => !previo);
    else setIsMobileOpen((previo) => !previo);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMobileOpen,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
        openMobileSidebar,
        closeMobileSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar debe usarse dentro de un SidebarProvider');
  }
  return context;
};
