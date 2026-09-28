import type { IconType } from 'react-icons';
import { FiBell, FiCheck, FiClock, FiFileText, FiRefreshCw, FiUserX } from 'react-icons/fi';
import {
  NotificationPriority,
  NotificationType,
  NotificationTypeLabels,
} from './notifications.types';
import type { Notification } from './notifications.types';

interface NotificationItemProps {
  notificacion: Notification;
  /** Abre el módulo al que apunta la alerta y la da por leída. */
  onAbrir: (notificacion: Notification) => void;
  /** Marca como leída sin salir del desplegable. */
  onMarcarLeida: (notificacion: Notification) => void;
}

/** Icono por tipo de alerta; el resto cae en la campana genérica. */
const ICONOS: Record<string, IconType> = {
  [NotificationType.AVISO_PRORROGA]: FiRefreshCw,
  [NotificationType.CONTRATO_SIN_FIRMAR]: FiFileText,
  [NotificationType.CLIENTE_SIN_ACTIVIDAD]: FiUserX,
  [NotificationType.FACTURA_VENCIDA]: FiClock,
};

/** Distintivo de color por prioridad. */
const PRIORIDAD_ESTILO: Record<string, string> = {
  [NotificationPriority.ALTA]: 'text-red-700 bg-red-500/15 border-red-500/30',
  [NotificationPriority.MEDIA]: 'text-amber-700 bg-amber-500/15 border-amber-500/30',
  [NotificationPriority.BAJA]: 'text-blue-700 bg-blue-500/15 border-blue-500/30',
};

/** Antigüedad de la alerta en palabras. */
const haceTexto = (valor: string): string => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';

  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;

  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'hace un mes' : `hace ${meses} meses`;
};

/**
 * Fila del desplegable de la campana.
 *
 * Las alertas sin leer se distinguen con fondo más opaco y un punto azul; el
 * botón de la derecha las marca como leídas sin navegar a ninguna parte.
 */
export const NotificationItem = ({
  notificacion,
  onAbrir,
  onMarcarLeida,
}: NotificationItemProps) => {
  const Icono = ICONOS[notificacion.tipo] ?? FiBell;
  const estilo =
    PRIORIDAD_ESTILO[notificacion.prioridad] ??
    'text-gray-700 bg-gray-500/15 border-gray-500/30';

  return (
    <li
      className={`flex items-start gap-2 px-3 py-2.5 border-b border-white/30 last:border-b-0 transition-colors ${
        notificacion.leida ? 'bg-transparent' : 'bg-blue-500/10'
      } hover:bg-white/50`}
    >
      <button
        type="button"
        onClick={() => onAbrir(notificacion)}
        className="flex items-start gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
      >
        <span
          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border backdrop-blur-sm flex-shrink-0 ${estilo}`}
        >
          <Icono className="w-4 h-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            {!notificacion.leida && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"
                aria-hidden="true"
              />
            )}
            <strong
              className={`text-sm truncate ${
                notificacion.leida
                  ? 'font-medium text-gray-700'
                  : 'font-semibold text-gray-900'
              }`}
            >
              {notificacion.titulo}
            </strong>
          </span>
          <span className="block text-xs text-gray-700 mt-0.5 line-clamp-2">
            {notificacion.mensaje}
          </span>
          <span className="block text-[11px] text-gray-500 mt-1">
            {NotificationTypeLabels[notificacion.tipo] ?? notificacion.tipo}
            {' · '}
            {haceTexto(notificacion.createdAt)}
          </span>
        </span>
      </button>

      {!notificacion.leida && (
        <button
          type="button"
          onClick={() => onMarcarLeida(notificacion)}
          title="Marcar como leída"
          aria-label={`Marcar como leída: ${notificacion.titulo}`}
          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-white/60 transition-colors flex-shrink-0 cursor-pointer"
        >
          <FiCheck className="w-4 h-4" />
        </button>
      )}
    </li>
  );
};
