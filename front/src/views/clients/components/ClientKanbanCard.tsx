import { FiMapPin, FiPhone, FiUser } from 'react-icons/fi';
import { Badge } from './Badge';
import { describeBudget, getFullName } from '../helpers/clientFormatters';
import {
  ClientTypeColors,
  ClientTypeLabels,
  getZoneColor,
  getZoneLabel,
} from '../enums/clientEnums';
import type { Client } from '../requests/clients.requests';

interface ClientKanbanCardProps {
  client: Client;
}

/** Tarjeta de cliente dentro de una columna del kanban. */
export const ClientKanbanCard = ({ client }: ClientKanbanCardProps) => {
  const budget = describeBudget(client);
  const nombreCompleto = getFullName(client);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 leading-tight">
          {nombreCompleto}
        </h4>
        <Badge className={ClientTypeColors[client.tipo]}>
          {ClientTypeLabels[client.tipo]}
        </Badge>
      </div>

      {budget && <p className="text-xs font-medium text-blue-800">{budget}</p>}

      {client.telefono && (
        <p className="flex items-center gap-1.5 text-xs text-gray-600">
          <FiPhone className="w-3 h-3 flex-shrink-0" />
          {client.telefono}
        </p>
      )}

      {client.zonasInteres?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <FiMapPin className="w-3 h-3 text-gray-500 flex-shrink-0" />
          {client.zonasInteres.slice(0, 3).map((zona) => (
            <Badge key={zona} className={getZoneColor(zona)}>
              {getZoneLabel(zona)}
            </Badge>
          ))}
          {client.zonasInteres.length > 3 && (
            <span className="text-xs text-gray-500">
              +{client.zonasInteres.length - 3}
            </span>
          )}
        </div>
      )}

      {client.responsable && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <FiUser className="w-3 h-3 flex-shrink-0" />
          {client.responsable.name ?? client.responsable.email}
        </p>
      )}
    </div>
  );
};
