import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiBell, FiCheckCircle, FiCheckSquare, FiRefreshCw } from 'react-icons/fi';

import { getErrorMessage } from '../../helpers/errorHandler';
import { notificationRequests } from './notifications.requests';
import { NotificationItem } from './NotificationItem';
import type { Notification } from './notifications.types';

interface NotificationBellProps {
  /** Cuántas alertas se traen al desplegable. Por defecto 10. */
  limite?: number;
  /** Cada cuántos milisegundos se refresca el contador. 0 lo desactiva. */
  intervaloRefresco?: number;
}

/**
 * Campana de alertas de la barra superior: botón con badge de no leídas y
 * desplegable con las últimas alertas.
 *
 * Consulta el contador al montar y cada `intervaloRefresco`, y trae la lista
 * completa solo al abrir el desplegable, para no cargar la API con datos que
 * nadie está mirando.
 *
 * MONTAJE: `Navbar.tsx` es un fichero de solo lectura para este dominio, así
 * que el componente se publica desde `components/notifications/index.ts` y se
 * monta sustituyendo el botón de campana provisional de la barra superior.
 */
export const NotificationBell = ({
  limite = 10,
  intervaloRefresco = 60000,
}: NotificationBellProps) => {
  const navigate = useNavigate();

  const [abierto, setAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  // Desglose del badge: `automaticas` es la cifra que enseña «Avisos abiertos»
  // del Panel y `manuales` los recordatorios escritos a mano, que el Panel no
  // cuenta. Sin enseñarlo, la campana y el Panel son dos números distintos en
  // la misma pantalla y no hay forma de saber por qué.
  const [automaticas, setAutomaticas] = useState(0);
  const [manuales, setManuales] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notification[]>([]);
  const [cargando, setCargando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // --- Datos ---------------------------------------------------------------

  const cargarContador = useCallback(async () => {
    try {
      const respuesta = await notificationRequests.countUnread();
      setNoLeidas(respuesta.data?.noLeidas ?? 0);
      setAutomaticas(respuesta.data?.automaticas ?? 0);
      setManuales(respuesta.data?.manuales ?? 0);
    } catch {
      // El contador es accesorio: si falla no se molesta a la persona usuaria con un
      // aviso, simplemente se reintentará en el siguiente ciclo.
    }
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await notificationRequests.findAll({ page: 1, size: limite });
      setNotificaciones(respuesta.data ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar las alertas'));
    } finally {
      setCargando(false);
    }
  }, [limite]);

  useEffect(() => {
    // La consulta del contador es una sincronización con un sistema externo (la
    // API): el estado se actualiza dentro de la promesa, no de forma síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarContador();

    if (!intervaloRefresco) return;
    const temporizador = window.setInterval(() => void cargarContador(), intervaloRefresco);
    return () => window.clearInterval(temporizador);
  }, [cargarContador, intervaloRefresco]);

  // --- Interacción ---------------------------------------------------------

  useEffect(() => {
    if (!abierto) return;

    const handleClickFuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAbierto(false);
    };

    document.addEventListener('mousedown', handleClickFuera);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickFuera);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [abierto]);

  const alternar = useCallback(() => {
    setAbierto((previo) => {
      if (!previo) {
        void cargarNotificaciones();
      }
      return !previo;
    });
  }, [cargarNotificaciones]);

  /** Marca una alerta como leída y ajusta el contador sin recargar la lista. */
  const marcarLeida = useCallback(
    async (notificacion: Notification) => {
      if (notificacion.leida) return;

      setNotificaciones((previas) =>
        previas.map((item) =>
          item.id === notificacion.id ? { ...item, leida: true } : item,
        ),
      );
      setNoLeidas((previo) => Math.max(previo - 1, 0));

      try {
        await notificationRequests.markAsRead(notificacion.id);
      } catch (error) {
        toast.error(getErrorMessage(error, 'No se pudo marcar la alerta como leída'));
        // Se revierte el ajuste optimista con el estado real del servidor.
        void cargarContador();
        void cargarNotificaciones();
      }
    },
    [cargarContador, cargarNotificaciones],
  );

  const abrirAlerta = useCallback(
    async (notificacion: Notification) => {
      await marcarLeida(notificacion);
      setAbierto(false);
      if (notificacion.enlace) navigate(notificacion.enlace);
    },
    [marcarLeida, navigate],
  );

  const marcarTodas = useCallback(async () => {
    try {
      const respuesta = await notificationRequests.markAllAsRead();
      toast.success(respuesta.message);
      setNotificaciones((previas) => previas.map((item) => ({ ...item, leida: true })));
      setNoLeidas(0);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron marcar las alertas'));
    }
  }, []);

  const revisarAhora = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await notificationRequests.runRules();
      toast.success(respuesta.message);
      await Promise.all([cargarContador(), cargarNotificaciones()]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo revisar las alertas'));
    } finally {
      setCargando(false);
    }
  }, [cargarContador, cargarNotificaciones]);

  // --- Presentación --------------------------------------------------------

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={alternar}
        aria-label={
          noLeidas > 0 ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'
        }
        aria-expanded={abierto}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-colors cursor-pointer select-none"
      >
        <FiBell className="w-5 h-5 text-gray-900" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white text-[10px] font-bold tabular-nums shadow-md ring-2 ring-white/60">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* En móvil el panel se ancla a la pantalla: colgado del botón se salía
          por la izquierda y el título quedaba cortado. */}
      {abierto && (
        <div className="fixed left-3 right-3 top-[4.5rem] bg-white border border-gray-200 rounded-xl shadow-xl ring-1 ring-gray-900/5 overflow-hidden z-50 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-200/70">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Alertas
                {noLeidas > 0 && (
                  <span className="ml-2 text-xs font-medium text-blue-700">
                    {noLeidas} sin leer
                  </span>
                )}
              </p>
              {/* Cuando hay recordatorios propios el badge deja de coincidir con
                  «Avisos abiertos» del Panel; el desglose lo explica en la misma
                  pantalla en la que se ven las dos cifras. */}
              {manuales > 0 && (
                <p className="text-[11px] text-gray-600 leading-tight">
                  {automaticas} del panel · {manuales} recordatorio
                  {manuales === 1 ? '' : 's'} tuyo{manuales === 1 ? '' : 's'}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => void revisarAhora()}
              disabled={cargando}
              title="Volver a evaluar las reglas de alertas"
              aria-label="Revisar alertas ahora"
              className="p-1.5 rounded-lg text-gray-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <FiRefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {cargando && notificaciones.length === 0 ? (
              <div className="p-3 space-y-2">
                {[0, 1, 2].map((fila) => (
                  <div key={fila} className="h-14 rounded-lg bg-white/50 animate-pulse" />
                ))}
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4 gap-2">
                <FiCheckCircle className="w-8 h-8 text-emerald-600" />
                <p className="text-sm font-medium text-gray-800">Sin alertas</p>
                <p className="text-xs text-gray-600">
                  No hay prórrogas próximas, contratos sin firmar ni clientes parados.
                </p>
              </div>
            ) : (
              <ul>
                {notificaciones.map((notificacion) => (
                  <NotificationItem
                    key={notificacion.id}
                    notificacion={notificacion}
                    onAbrir={(item) => void abrirAlerta(item)}
                    onMarcarLeida={(item) => void marcarLeida(item)}
                  />
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => void marcarTodas()}
            disabled={noLeidas === 0}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50 border-t border-gray-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FiCheckSquare className="w-4 h-4" />
            Marcar todas como leídas
          </button>
        </div>
      )}
    </div>
  );
};
