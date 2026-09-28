import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { IconType } from 'react-icons';
import {
  FiGrid,
  FiUsers,
  FiHome,
  FiFileText,
  FiFolder,
  FiDollarSign,
  FiMic,
  FiChevronLeft,
  FiX,
} from 'react-icons/fi';
import { useSidebar } from '../context/SidebarContext';
import { usePrivileges } from '../hooks/usePrivileges';
import { getRoutePrivilege } from '../config/routePrivileges';

interface MenuItem {
  icon: IconType;
  label: string;
  path: string;
}

/**
 * Menú lateral de CRMIA.
 *
 * Las entradas se filtran por el privilegio que `routePrivileges` asocia a cada
 * ruta, de modo que un rol sin permiso no ve la opción en lugar de verla y
 * chocar con un 403 al entrar.
 */
const MENU_ITEMS: MenuItem[] = [
  { icon: FiGrid, label: 'Panel', path: '/dashboard' },
  { icon: FiUsers, label: 'Clientes', path: '/clientes' },
  { icon: FiHome, label: 'Propiedades', path: '/propiedades' },
  { icon: FiFileText, label: 'Contratos', path: '/contratos' },
  { icon: FiFolder, label: 'Documentos', path: '/documentos' },
  { icon: FiDollarSign, label: 'Facturas', path: '/facturas' },
  { icon: FiMic, label: 'Asistente IA', path: '/asistente' },
];

/**
 * Menú lateral. Por encima de `lg` vive fijo junto al contenido y se puede
 * reducir al carril de iconos; por debajo se comporta como un cajón que entra
 * por la izquierda sobre un velo y se cierra al navegar.
 */
export const Sidebar = () => {
  const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar();
  const location = useLocation();
  const { hasPrivilege } = usePrivileges();

  // Navegar cierra el cajón: en un móvil, si no, el menú tapa la vista recién
  // abierta y hay que buscar el botón de cerrar.
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  const menuItems = MENU_ITEMS.filter((item) => {
    const requiredPrivilege = getRoutePrivilege(item.path);
    if (requiredPrivilege === null) return true;
    return hasPrivilege(requiredPrivilege);
  });

  return (
    <>
      {/* Velo del cajón: cerrar tocando fuera es el gesto esperado en móvil. */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 top-16 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed left-0 top-16 bottom-0 backdrop-blur-xl bg-white/20 border-r border-white/30 transition-transform duration-300 ease-in-out z-40 w-64 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } lg:translate-x-0 lg:shadow-none lg:transition-all ${
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-white/30 flex items-center justify-between">
            <h2
              className={`text-sm font-semibold text-gray-900 uppercase tracking-wider select-none drop-shadow-sm ${
                isCollapsed ? 'lg:hidden' : ''
              }`}
            >
              Menú
            </h2>

            {/* Móvil: cerrar el cajón. Escritorio: reducir al carril de iconos. */}
            <button
              type="button"
              onClick={closeMobileSidebar}
              className="lg:hidden ml-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-colors cursor-pointer select-none"
              aria-label="Cerrar el menú"
            >
              <FiX className="w-5 h-5 text-gray-900" />
            </button>

            <button
              type="button"
              onClick={toggleSidebar}
              className={`hidden lg:flex min-h-11 min-w-11 items-center justify-center rounded-lg backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-colors cursor-pointer select-none ${
                isCollapsed ? 'lg:mx-auto' : 'lg:ml-auto'
              }`}
              aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
            >
              <FiChevronLeft
                className={`w-5 h-5 text-gray-900 transition-transform duration-300 ${
                  isCollapsed ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={closeMobileSidebar}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-gray-900 backdrop-blur-sm transition-colors cursor-pointer select-none ${
                        isCollapsed ? 'lg:justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-white/45 font-semibold shadow-sm border border-white/40'
                          : 'bg-white/20 hover:bg-white/30 border border-transparent'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 pointer-events-none ${
                          isActive ? 'text-blue-700' : ''
                        }`}
                      />
                      <span
                        className={`text-sm font-medium pointer-events-none ${
                          isCollapsed ? 'lg:hidden' : ''
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className={`p-4 border-t border-white/30 ${isCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs text-gray-600 select-none">CRMIA · v0.1</p>
          </div>
        </div>
      </aside>
    </>
  );
};
