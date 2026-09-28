/**
 * Punto de entrada del módulo de alertas del front.
 *
 * MONTAJE EN LA BARRA SUPERIOR
 * ----------------------------
 * `components/Navbar.tsx` trae un botón de campana provisional (solo visual) y
 * es un fichero de solo lectura para este dominio, así que la campana real no
 * se monta sola. Para activarla basta con dos cambios en `Navbar.tsx`:
 *
 *   1. Añadir el import:
 *        import { NotificationBell } from './notifications';
 *   2. Sustituir el `<button ... aria-label="Notificaciones"> ... </button>`
 *      del bloque derecho por:
 *        <NotificationBell />
 *
 * (`FiBell` deja de usarse en `Navbar.tsx` tras el cambio: conviene quitarlo
 * del import de `react-icons/fi` para que no salte el aviso de importación sin
 * usar en la compilación.)
 */
export { NotificationBell } from './NotificationBell';
export { NotificationItem } from './NotificationItem';
export { notificationRequests } from './notifications.requests';
export {
  NotificationEntityType,
  NotificationEntityTypeLabels,
  NotificationPriority,
  NotificationPriorityLabels,
  NotificationType,
  NotificationTypeLabels,
} from './notifications.types';
export type {
  Notification,
  NotificationCounter,
  NotificationEntityTypeValue,
  NotificationFilters,
  NotificationPriorityValue,
  NotificationTypeValue,
} from './notifications.types';
