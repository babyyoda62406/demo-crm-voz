import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  FiEdit2,
  FiMail,
  FiPhone,
  FiPlus,
  FiRotateCcw,
  FiSlash,
  FiUser,
} from 'react-icons/fi';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Badge } from './Badge';
import { ClientTimeline } from './ClientTimeline';
import { useFetch } from '../../../hooks/useFetch';
import { useClientActions } from '../hooks/useClients';
import { formatCurrency, formatDate, formatDateTime } from '../../../helpers/formatters';
import type { ItResponse } from '../../../types/api.types';
import {
  BusinessLineColors,
  BusinessLineLabels,
  ClientActivityType,
  ClientActivityTypeLabels,
  ClientStatus,
  ClientStatusColors,
  ClientStatusLabels,
  ClientTypeColors,
  ClientTypeLabels,
  getOperationTypeLabel,
  getStageColor,
  getStageLabel,
  getZoneColor,
  getZoneLabel,
  ManualClientActivityTypes,
} from '../enums/clientEnums';
import type { Client } from '../requests/clients.requests';

interface ClientDetailModalProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDiscard: (client: Client) => void;
  /** Se invoca cuando algo cambia, para que el listado de fondo se refresque. */
  onChanged: () => void;
}

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 text-gray-900 placeholder-gray-600 text-base';

interface DataRowProps {
  label: string;
  children: ReactNode;
}

const DataRow = ({ label, children }: DataRowProps) => (
  <div className="flex items-start justify-between gap-4 py-1.5">
    <span className="text-sm text-gray-600 select-none flex-shrink-0">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right">{children}</span>
  </div>
);

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-xl border border-white/30 backdrop-blur-md bg-white/25 p-4">
    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3 select-none">
      {title}
    </h3>
    {children}
  </section>
);

/** Ficha completa: datos, perfil inversor e historial en línea de tiempo. */
export const ClientDetailModal = ({
  clientId,
  isOpen,
  onClose,
  onEdit,
  onDiscard,
  onChanged,
}: ClientDetailModalProps) => {
  const { data, loading, refetch } = useFetch<ItResponse<Client>>(
    `/clients/${clientId}`,
  );
  const { addActivity, restoreClient, isSaving } = useClientActions();

  const [activityType, setActivityType] = useState<ClientActivityType>(
    ClientActivityType.NOTA,
  );
  const [activityText, setActivityText] = useState('');

  const client = data?.data ?? null;

  const handleAddActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !activityText.trim()) return;

    const created = await addActivity(client.id, {
      tipo: activityType,
      descripcion: activityText.trim(),
    });

    if (created) {
      setActivityText('');
      await refetch();
      onChanged();
    }
  };

  const handleRestore = async () => {
    if (!client) return;
    const restored = await restoreClient(client.id);
    if (restored) {
      await refetch();
      onChanged();
    }
  };

  const nombreCompleto = client
    ? `${client.nombre} ${client.apellidos ?? ''}`.trim()
    : 'Cliente';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={nombreCompleto} size="xl">
      {loading && !client ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !client ? (
        <p className="text-center text-gray-600 py-16 select-none">
          No se ha podido cargar la ficha del cliente.
        </p>
      ) : (
        <div className="space-y-5">
          {/* --- Cabecera con etiquetas y acciones --- */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={ClientTypeColors[client.tipo]}>
              {ClientTypeLabels[client.tipo]}
            </Badge>
            <Badge className={BusinessLineColors[client.lineaNegocio]}>
              {BusinessLineLabels[client.lineaNegocio]}
            </Badge>
            <Badge className={getStageColor(client.etapa)}>
              {getStageLabel(client.etapa)}
            </Badge>
            <Badge className={ClientStatusColors[client.estado]}>
              {ClientStatusLabels[client.estado]}
            </Badge>

            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => onEdit(client)}
                className="flex items-center gap-2 px-4 py-2"
              >
                <FiEdit2 className="w-4 h-4" />
                Editar
              </Button>

              {client.estado === ClientStatus.ACTIVO ? (
                <Button
                  variant="ghost"
                  onClick={() => onDiscard(client)}
                  className="flex items-center gap-2 px-4 py-2 text-rose-700"
                >
                  <FiSlash className="w-4 h-4" />
                  Descartar
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleRestore}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-emerald-700"
                >
                  <FiRotateCcw className="w-4 h-4" />
                  Reactivar
                </Button>
              )}
            </div>
          </div>

          {/* --- Aviso de descarte --- */}
          {client.estado === ClientStatus.DESCARTADO && (
            <div className="rounded-lg border border-rose-200/60 bg-rose-50/40 backdrop-blur-md px-4 py-3">
              <p className="text-sm text-rose-900">
                <strong>Descartado</strong>
                {client.fechaDescarte ? ` el ${formatDate(client.fechaDescarte)}` : ''}:{' '}
                {client.motivoDescarte ?? 'sin motivo registrado'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* --- Columna izquierda: datos --- */}
            <div className="space-y-4">
              <SectionCard title="Datos de contacto">
                <div className="divide-y divide-white/30">
                  <DataRow label="Correo">
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"
                      >
                        <FiMail className="w-3.5 h-3.5" />
                        {client.email}
                      </a>
                    ) : (
                      '—'
                    )}
                  </DataRow>
                  <DataRow label="Teléfono">
                    {client.telefono ? (
                      <a
                        href={`tel:${client.telefono}`}
                        className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"
                      >
                        <FiPhone className="w-3.5 h-3.5" />
                        {client.telefono}
                      </a>
                    ) : (
                      '—'
                    )}
                  </DataRow>
                  <DataRow label="Documento">{client.documento ?? '—'}</DataRow>
                  <DataRow label="Origen">{client.origen ?? '—'}</DataRow>
                  <DataRow label="Responsable">
                    {client.responsable ? (
                      <span className="inline-flex items-center gap-1.5">
                        <FiUser className="w-3.5 h-3.5 text-gray-500" />
                        {[client.responsable.name, client.responsable.lastName]
                          .filter(Boolean)
                          .join(' ') || client.responsable.email}
                      </span>
                    ) : (
                      '—'
                    )}
                  </DataRow>
                  <DataRow label="Alta">{formatDate(client.createdAt)}</DataRow>
                  <DataRow label="Última actividad">
                    {formatDateTime(client.updatedAt)}
                  </DataRow>
                </div>
              </SectionCard>

              <SectionCard title="Perfil inversor">
                <div className="divide-y divide-white/30">
                  <DataRow label="Presupuesto mínimo">
                    {formatCurrency(client.presupuestoMin)}
                  </DataRow>
                  <DataRow label="Presupuesto máximo">
                    {formatCurrency(client.presupuestoMax)}
                  </DataRow>
                  <DataRow label="Tipo de operación">
                    {getOperationTypeLabel(client.tipoOperacion)}
                  </DataRow>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2 select-none">
                    Zonas de interés
                  </p>
                  {client.zonasInteres?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {client.zonasInteres.map((zona) => (
                        <Badge key={zona} className={getZoneColor(zona)}>
                          {getZoneLabel(zona)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Sin zonas asignadas</p>
                  )}
                </div>
              </SectionCard>

              {client.notas && (
                <SectionCard title="Notas">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {client.notas}
                  </p>
                </SectionCard>
              )}
            </div>

            {/* --- Columna derecha: historial --- */}
            <div className="space-y-4">
              <SectionCard title="Registrar actividad">
                <form onSubmit={handleAddActivity} className="space-y-3">
                  <select
                    value={activityType}
                    onChange={(event) =>
                      setActivityType(event.target.value as ClientActivityType)
                    }
                    aria-label="Tipo de actividad"
                    className={`${controlClasses} cursor-pointer`}
                  >
                    {ManualClientActivityTypes.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {ClientActivityTypeLabels[tipo]}
                      </option>
                    ))}
                  </select>

                  <textarea
                    rows={2}
                    value={activityText}
                    onChange={(event) => setActivityText(event.target.value)}
                    placeholder="¿Qué ha pasado con este cliente?"
                    aria-label="Descripción de la actividad"
                    className={`${controlClasses} resize-y`}
                  />

                  <Button
                    type="submit"
                    isLoading={isSaving}
                    disabled={!activityText.trim()}
                    className="flex items-center gap-2 w-full justify-center"
                  >
                    <FiPlus className="w-4 h-4" />
                    Añadir al historial
                  </Button>
                </form>
              </SectionCard>

              <SectionCard title="Historial">
                <div className="max-h-[420px] overflow-y-auto pr-1">
                  <ClientTimeline activities={client.actividades ?? []} />
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
