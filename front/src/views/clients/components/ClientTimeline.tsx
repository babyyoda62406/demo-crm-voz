import { Badge } from './Badge';
import { formatDateTime } from '../../../helpers/formatters';
import {
  getActivityColor,
  getActivityDotColor,
  getActivityLabel,
} from '../enums/clientEnums';
import type { ClientActivity } from '../requests/clients.requests';

interface ClientTimelineProps {
  activities: ClientActivity[];
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Historial del cliente en formato línea de tiempo: hito más reciente arriba.
 */
export const ClientTimeline = ({
  activities,
  isLoading = false,
  emptyMessage = 'Todavía no hay actividad registrada.',
}: ClientTimelineProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8 select-none">{emptyMessage}</p>
    );
  }

  return (
    <ol className="relative pl-6">
      {/* Raíl vertical que une los hitos. */}
      <span
        className="absolute left-[7px] top-2 bottom-2 w-px bg-white/60"
        aria-hidden="true"
      />

      {activities.map((activity) => (
        <li key={activity.id} className="relative pb-5 last:pb-0">
          <span
            className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full ring-2 ring-white/70 ${getActivityDotColor(activity.tipo)}`}
            aria-hidden="true"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getActivityColor(activity.tipo)}>
              {getActivityLabel(activity.tipo)}
            </Badge>
            <time className="text-xs text-gray-600" dateTime={activity.fecha}>
              {formatDateTime(activity.fecha)}
            </time>
            {activity.autor && (
              <span className="text-xs text-gray-500">· {activity.autor}</span>
            )}
          </div>

          <p className="mt-1 text-sm text-gray-900 leading-snug">
            {activity.descripcion}
          </p>
        </li>
      ))}
    </ol>
  );
};
