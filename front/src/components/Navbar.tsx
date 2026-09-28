import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Hamburger from 'hamburger-react';
import { FiSearch, FiMic, FiUser, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { APP_CONFIG } from '../config/global';
import { Logo } from './Logo';
import { NotificationBell } from './notifications';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { toggleSidebar, isCollapsed, isMobileOpen } = useSidebar();
  const esEscritorio = useIsDesktop();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.name
    ? `${user.name}${user.lastName ? ` ${user.lastName}` : ''}`
    : (user?.email ?? 'Usuaria');

  /** El buscador global lleva el texto al filtro de búsqueda de Clientes. */
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const texto = searchQuery.trim();
    if (!texto) return;

    setSearchQuery('');
    navigate(`/clientes?buscar=${encodeURIComponent(texto)}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 backdrop-blur-xl bg-white/20 border-b border-white/30 z-50">
      <div className="h-full flex items-center justify-between px-2 sm:px-4 gap-2 sm:gap-4">
        {/* Izquierda: menú, logo y marca */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {/* En móvil la hamburguesa abre el cajón; en escritorio contrae el
              menú al carril de iconos. El aspa refleja lo que hace cada una. */}
          <Hamburger
            toggled={esEscritorio ? !isCollapsed : isMobileOpen}
            toggle={toggleSidebar}
            size={24}
            color="#1f2937"
            rounded
            hideOutline
            label="Alternar menú lateral"
          />
          <Logo className="h-9 w-9 hidden sm:block" />
          <div className="leading-tight select-none min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-gray-900 drop-shadow-sm truncate">
              {APP_CONFIG.APP_NAME}
            </h1>
            <p className="hidden sm:block text-[11px] font-medium text-gray-600 tracking-wide">
              {APP_CONFIG.APP_SUBTITLE}
            </p>
          </div>
        </div>

        {/* Derecha: búsqueda, asistente por voz, notificaciones y perfil */}
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          <form
            role="search"
            onSubmit={handleSearch}
            className="relative hidden md:block"
          >
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              aria-label="Buscar clientes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 backdrop-blur-md bg-white/40 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 text-gray-900 placeholder-gray-600 text-base"
            />
          </form>

          {/* Micrófono global: abre el asistente de voz */}
          <button
            type="button"
            onClick={() => navigate('/asistente')}
            title="Asistente de voz"
            aria-label="Abrir asistente de voz"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all cursor-pointer select-none"
          >
            <FiMic className="w-5 h-5" />
          </button>

          {/* Campana de alertas con desplegable (prórrogas, firmas, impagos). */}
          <NotificationBell />

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-2 backdrop-blur-sm bg-white/30 hover:bg-white/40 rounded-lg transition-colors cursor-pointer select-none"
            >
              <span className="w-9 h-9 rounded-full bg-white/50 backdrop-blur-sm border border-white/30 flex items-center justify-center overflow-hidden">
                {user?.name ? (
                  <span className="text-gray-900 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <FiUser className="w-5 h-5 text-gray-900" />
                )}
              </span>
              <span className="hidden md:block text-left">
                <span className="block text-sm font-medium text-gray-900">{displayName}</span>
                <span className="block text-xs text-gray-600">{user?.email ?? ''}</span>
              </span>
            </button>

            {/*
              El fondo va opaco a propósito: la cabecera ya tiene
              `backdrop-blur`, así que el desenfoque de un hijo no tiene nada
              que desenfocar y el contenido del panel se leería a través.
            */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl ring-1 ring-gray-900/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200/70">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-600 truncate">{user?.email ?? ''}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <FiLogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
