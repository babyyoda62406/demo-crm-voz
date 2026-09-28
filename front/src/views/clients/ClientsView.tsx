import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiColumns,
  FiEdit2,
  FiEye,
  FiList,
  FiPlus,
  FiRotateCcw,
  FiSlash,
  FiTrash2,
  FiUpload,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { FilterBar } from '../../components/FilterBar';
import type { FilterField, FilterValue } from '../../components/FilterBar';
import { CollapsibleFilters } from '../../components/CollapsibleFilters';
import { Pagination } from '../../components/Pagination';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Badge } from './components/Badge';
import { ClientFormModal } from './components/ClientFormModal';
import { ClientDetailModal } from './components/ClientDetailModal';
import { DiscardClientModal } from './components/DiscardClientModal';
import { ImportClientsModal } from './components/ImportClientsModal';
import { ClientsKanbanTab } from './components/ClientsKanbanTab';
import { useClientActions, useClientsList } from './hooks/useClients';
import { describeBudget, getFullName } from './helpers/clientFormatters';
import { formatDate } from '../../helpers/formatters';
import {
  BusinessLine,
  BusinessLineColors,
  BusinessLineList,
  BusinessLineShortLabels,
  ClientStageLabels,
  ClientStatus,
  ClientTypeColors,
  ClientTypeLabels,
  ClientTypeList,
  getStageColor,
  getStageLabel,
  getStagesByBusinessLine,
  getZoneColor,
  getZoneLabel,
  InterestZoneLabels,
  InterestZoneList,
} from './enums/clientEnums';
import type { Client } from './requests/clients.requests';
import type { FindAllClientsParams } from './requests/clients.requests';

type TabId = 'lista' | 'kanban' | 'descartados';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: IconType;
}

const TABS: TabDefinition[] = [
  { id: 'lista', label: 'Listado', icon: FiList },
  { id: 'kanban', label: 'Kanban', icon: FiColumns },
  { id: 'descartados', label: 'Descartados', icon: FiSlash },
];

/** Filtros de la barra superior. Se aplican al pulsar «Buscar». */
interface FiltersState {
  search: string;
  lineaNegocio: string;
  etapa: string;
  tipo: string;
  zona: string;
  presupuestoDesde: string;
  presupuestoHasta: string;
}

const EMPTY_FILTERS: FiltersState = {
  search: '',
  lineaNegocio: '',
  etapa: '',
  tipo: '',
  zona: '',
  presupuestoDesde: '',
  presupuestoHasta: '',
};

/** Los filtros que no se envían deben ir como `undefined`, no como ''. */
const EMPTY_QUERY: FindAllClientsParams = {
  search: undefined,
  lineaNegocio: undefined,
  etapa: undefined,
  tipo: undefined,
  zona: undefined,
  presupuestoDesde: undefined,
  presupuestoHasta: undefined,
};

/** Botón de acción de una fila de la tabla. */
const RowAction = ({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors cursor-pointer select-none md:min-h-9 md:min-w-9 ${className}`}
  >
    {children}
  </button>
);

/**
 * Vista de Clientes: listado con filtros, tablero kanban por línea de negocio
 * y bandeja de descartados, más el alta/edición, la ficha y la importación.
 */
export const ClientsView = () => {
  const [activeTab, setActiveTab] = useState<TabId>('lista');

  // El buscador global del navbar navega a /clientes?buscar=…
  const [searchParams] = useSearchParams();
  const buscarUrl = searchParams.get('buscar') ?? '';

  const [filters, setFilters] = useState<FiltersState>(() => ({
    ...EMPTY_FILTERS,
    search: buscarUrl,
  }));
  const [kanbanLine, setKanbanLine] = useState<BusinessLine>(BusinessLine.PSI);
  const [reloadToken, setReloadToken] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [clientToDiscard, setClientToDiscard] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [detailClientId, setDetailClientId] = useState<number | null>(null);

  const { clients, metadata, isLoading, updateParams, setPage, setPageSize, refetch } =
    useClientsList({ estado: ClientStatus.ACTIVO, search: buscarUrl || undefined });

  // Si el navbar vuelve a buscar estando ya en /clientes, la vista no se
  // remonta: hay que reaccionar al cambio del parámetro. El primer render ya
  // queda cubierto por el estado inicial de arriba.
  const [buscarPrevio, setBuscarPrevio] = useState(buscarUrl);
  if (buscarPrevio !== buscarUrl) {
    setBuscarPrevio(buscarUrl);
    if (buscarUrl) {
      setActiveTab('lista');
      setFilters({ ...EMPTY_FILTERS, search: buscarUrl });
      updateParams({ ...EMPTY_QUERY, estado: ClientStatus.ACTIVO, search: buscarUrl });
    }
  }
  const { removeClient, restoreClient, isSaving } = useClientActions();

  const isDiscardedTab = activeTab === 'descartados';

  /** Recarga el listado y avisa al kanban de que hay datos nuevos. */
  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
    void refetch();
  }, [refetch]);

  // -------------------------------------------------------------------------
  // Filtros
  // -------------------------------------------------------------------------

  const etapaOptions = useMemo(() => {
    const lineas = filters.lineaNegocio
      ? [filters.lineaNegocio as BusinessLine]
      : BusinessLineList;

    const etapas = Array.from(new Set(lineas.flatMap(getStagesByBusinessLine)));
    return etapas.map((etapa) => ({
      value: etapa as string,
      label: ClientStageLabels[etapa],
    }));
  }, [filters.lineaNegocio]);

  const filterFields = useMemo<FilterField[]>(() => {
    const base: FilterField[] = [
      {
        key: 'search',
        label: 'Buscar',
        type: 'text',
        placeholder: 'Nombre, correo, teléfono o documento...',
      },
      {
        key: 'lineaNegocio',
        label: 'Línea de negocio',
        type: 'select',
        options: BusinessLineList.map((linea) => ({
          value: linea,
          label: BusinessLineShortLabels[linea],
        })),
      },
      {
        key: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: ClientTypeList.map((tipo) => ({
          value: tipo,
          label: ClientTypeLabels[tipo],
        })),
      },
    ];

    if (isDiscardedTab) return base;

    return [
      ...base,
      { key: 'etapa', label: 'Etapa', type: 'select', options: etapaOptions },
      {
        key: 'zona',
        label: 'Zona',
        type: 'select',
        options: InterestZoneList.map((zona) => ({
          value: zona,
          label: InterestZoneLabels[zona],
        })),
      },
      {
        key: 'presupuestoDesde',
        label: 'Presupuesto desde (€)',
        type: 'number',
        placeholder: '100000',
      },
      {
        key: 'presupuestoHasta',
        label: 'Presupuesto hasta (€)',
        type: 'number',
        placeholder: '250000',
      },
    ];
  }, [isDiscardedTab, etapaOptions]);

  /** Filtros con valor: se anuncian en el botón plegado de móvil. */
  const filtrosActivos = useMemo(
    () => Object.values(filters).filter((valor) => valor !== '').length,
    [filters],
  );

  const handleFilterChange = (key: string, value: FilterValue) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value === undefined ? '' : String(value),
      // Cambiar de línea invalida la etapa elegida: pertenecía a otro pipeline.
      ...(key === 'lineaNegocio' ? { etapa: '' } : {}),
    }));
  };

  const handleSearch = () => {
    updateParams({
      estado: isDiscardedTab ? ClientStatus.DESCARTADO : ClientStatus.ACTIVO,
      search: filters.search || undefined,
      lineaNegocio: (filters.lineaNegocio as BusinessLine) || undefined,
      etapa: filters.etapa || undefined,
      tipo: (filters.tipo as Client['tipo']) || undefined,
      zona: (filters.zona as Client['zonasInteres'][number]) || undefined,
      presupuestoDesde: filters.presupuestoDesde
        ? Number(filters.presupuestoDesde)
        : undefined,
      presupuestoHasta: filters.presupuestoHasta
        ? Number(filters.presupuestoHasta)
        : undefined,
    });
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    updateParams({
      ...EMPTY_QUERY,
      estado: isDiscardedTab ? ClientStatus.DESCARTADO : ClientStatus.ACTIVO,
    });
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'kanban') return;

    setFilters(EMPTY_FILTERS);
    updateParams({
      ...EMPTY_QUERY,
      estado: tab === 'descartados' ? ClientStatus.DESCARTADO : ClientStatus.ACTIVO,
    });
  };

  // -------------------------------------------------------------------------
  // Acciones
  // -------------------------------------------------------------------------

  const openCreate = () => {
    setClientToEdit(null);
    setIsFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setClientToEdit(client);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    await removeClient(clientToDelete.id);
    setClientToDelete(null);
    setDetailClientId(null);
    reload();
  };

  const handleRestore = async (client: Client) => {
    const restored = await restoreClient(client.id);
    if (restored) reload();
  };

  // -------------------------------------------------------------------------
  // Columnas de la tabla
  // -------------------------------------------------------------------------

  const columns = useMemo<Column<Client>[]>(() => {
    const clienteColumn: Column<Client> = {
      key: 'nombre',
      header: 'Cliente',
      render: (client) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{getFullName(client)}</p>
          <p className="text-xs text-gray-600 truncate">
            {client.email ?? client.telefono ?? 'Sin datos de contacto'}
          </p>
        </div>
      ),
    };

    const lineaColumn: Column<Client> = {
      key: 'lineaNegocio',
      header: 'Línea',
      render: (client) => (
        <Badge className={BusinessLineColors[client.lineaNegocio]}>
          {BusinessLineShortLabels[client.lineaNegocio]}
        </Badge>
      ),
    };

    if (isDiscardedTab) {
      return [
        clienteColumn,
        lineaColumn,
        {
          key: 'etapa',
          header: 'Etapa',
          render: (client) => (
            <Badge className={getStageColor(client.etapa)}>
              {getStageLabel(client.etapa)}
            </Badge>
          ),
        },
        {
          key: 'motivoDescarte',
          header: 'Motivo del descarte',
          render: (client) => (
            <span className="text-sm text-gray-800">
              {client.motivoDescarte ?? '—'}
            </span>
          ),
        },
        {
          key: 'fechaDescarte',
          header: 'Descartado el',
          className: 'whitespace-nowrap',
          render: (client) => formatDate(client.fechaDescarte),
        },
        {
          key: 'acciones',
          header: 'Acciones',
          className: 'w-32',
          render: (client) => (
            <div className="flex items-center gap-1">
              <RowAction
                title="Ver ficha"
                onClick={() => setDetailClientId(client.id)}
                className="text-blue-600 hover:bg-blue-50/60"
              >
                <FiEye className="w-4 h-4" />
              </RowAction>
              <RowAction
                title="Reactivar"
                onClick={() => void handleRestore(client)}
                className="text-emerald-600 hover:bg-emerald-50/60"
              >
                <FiRotateCcw className="w-4 h-4" />
              </RowAction>
              <RowAction
                title="Eliminar"
                onClick={() => setClientToDelete(client)}
                className="text-red-600 hover:bg-red-50/60"
              >
                <FiTrash2 className="w-4 h-4" />
              </RowAction>
            </div>
          ),
        },
      ];
    }

    return [
      clienteColumn,
      {
        key: 'tipo',
        header: 'Tipo',
        render: (client) => (
          <Badge className={ClientTypeColors[client.tipo]}>
            {ClientTypeLabels[client.tipo]}
          </Badge>
        ),
      },
      lineaColumn,
      {
        key: 'etapa',
        header: 'Etapa',
        render: (client) => (
          <Badge className={getStageColor(client.etapa)}>
            {getStageLabel(client.etapa)}
          </Badge>
        ),
      },
      {
        key: 'presupuesto',
        header: 'Presupuesto',
        className: 'whitespace-nowrap',
        render: (client) => describeBudget(client) ?? '—',
      },
      {
        key: 'zonasInteres',
        header: 'Zonas',
        render: (client) =>
          client.zonasInteres?.length ? (
            <div className="flex flex-wrap gap-1">
              {client.zonasInteres.slice(0, 2).map((zona) => (
                <Badge key={zona} className={getZoneColor(zona)}>
                  {getZoneLabel(zona)}
                </Badge>
              ))}
              {client.zonasInteres.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{client.zonasInteres.length - 2}
                </span>
              )}
            </div>
          ) : (
            '—'
          ),
      },
      {
        key: 'updatedAt',
        header: 'Actualizado',
        className: 'whitespace-nowrap',
        render: (client) => formatDate(client.updatedAt),
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'w-40',
        render: (client) => (
          <div className="flex items-center gap-1">
            <RowAction
              title="Ver ficha"
              onClick={() => setDetailClientId(client.id)}
              className="text-blue-600 hover:bg-blue-50/60"
            >
              <FiEye className="w-4 h-4" />
            </RowAction>
            <RowAction
              title="Editar"
              onClick={() => openEdit(client)}
              className="text-gray-700 hover:bg-white/50"
            >
              <FiEdit2 className="w-4 h-4" />
            </RowAction>
            <RowAction
              title="Descartar"
              onClick={() => setClientToDiscard(client)}
              className="text-amber-600 hover:bg-amber-50/60"
            >
              <FiSlash className="w-4 h-4" />
            </RowAction>
            <RowAction
              title="Eliminar"
              onClick={() => setClientToDelete(client)}
              className="text-red-600 hover:bg-red-50/60"
            >
              <FiTrash2 className="w-4 h-4" />
            </RowAction>
          </div>
        ),
      },
    ];
    // `handleRestore` se recrea en cada render pero solo se invoca al pulsar,
    // por lo que no forma parte de las dependencias de la memoización.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDiscardedTab]);

  // -------------------------------------------------------------------------
  // Tarjeta del listado en móvil
  // -------------------------------------------------------------------------

  /**
   * Fila del listado en formato tarjeta para móvil. La tabla de ocho columnas
   * es ilegible en 390 px: aquí manda el nombre, y las acciones son botones de
   * 44 px que se pueden pulsar con el dedo.
   */
  const renderClientCard = (client: Client) => (
    <div className="space-y-3">
      <div
        onClick={() => setDetailClientId(client.id)}
        className="cursor-pointer space-y-2"
      >
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 break-words">{getFullName(client)}</p>
          <p className="text-sm text-gray-600 break-words">
            {client.email ?? client.telefono ?? 'Sin datos de contacto'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={ClientTypeColors[client.tipo]}>
            {ClientTypeLabels[client.tipo]}
          </Badge>
          <Badge className={BusinessLineColors[client.lineaNegocio]}>
            {BusinessLineShortLabels[client.lineaNegocio]}
          </Badge>
          <Badge className={getStageColor(client.etapa)}>{getStageLabel(client.etapa)}</Badge>
        </div>

        {isDiscardedTab ? (
          <p className="text-sm text-gray-700">
            {client.motivoDescarte ?? 'Sin motivo'} · {formatDate(client.fechaDescarte)}
          </p>
        ) : (
          <p className="text-sm text-gray-700">
            {describeBudget(client) ?? 'Sin presupuesto'}
            {client.zonasInteres?.length
              ? ` · ${client.zonasInteres.map(getZoneLabel).join(', ')}`
              : ''}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <RowAction
          title="Ver ficha"
          onClick={() => setDetailClientId(client.id)}
          className="text-blue-700 bg-blue-100/70"
        >
          <FiEye className="w-5 h-5" />
        </RowAction>
        {isDiscardedTab ? (
          <RowAction
            title="Reactivar"
            onClick={() => void handleRestore(client)}
            className="text-emerald-600 bg-emerald-50/50"
          >
            <FiRotateCcw className="w-5 h-5" />
          </RowAction>
        ) : (
          <>
            <RowAction
              title="Editar"
              onClick={() => openEdit(client)}
              className="text-gray-700 bg-white/40"
            >
              <FiEdit2 className="w-5 h-5" />
            </RowAction>
            <RowAction
              title="Descartar"
              onClick={() => setClientToDiscard(client)}
              className="text-amber-600 bg-amber-50/50"
            >
              <FiSlash className="w-5 h-5" />
            </RowAction>
          </>
        )}
        <RowAction
          title="Eliminar"
          onClick={() => setClientToDelete(client)}
          className="text-red-600 bg-red-50/50 ml-auto"
        >
          <FiTrash2 className="w-5 h-5" />
        </RowAction>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 md:p-6 gap-3 md:gap-4">
      {/* --- Cabecera --- */}
      <div className="flex-shrink-0 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 md:p-2.5 rounded-xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
            <FiUsers className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 drop-shadow-sm select-none">
              Clientes
            </h1>
            <p className="hidden sm:block text-sm text-gray-700 select-none">
              Inversores, empresas y particulares: ficha, seguimiento y pipeline.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2.5 md:px-4"
          >
            <FiUpload className="w-4 h-4" />
            Importar<span className="hidden md:inline"> CSV/Excel</span>
          </Button>
          <Button onClick={openCreate} className="flex items-center gap-2 px-3 py-2.5 md:px-4">
            <FiPlus className="w-4 h-4" />
            Nuevo<span className="hidden md:inline"> cliente</span>
          </Button>
        </div>
      </div>

      {/* --- Pestañas --- */}
      <div className="flex-shrink-0 flex gap-1.5 sm:flex-wrap sm:gap-2" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold border transition-all cursor-pointer select-none sm:flex-none sm:gap-2 sm:px-4 ${
                isActive
                  ? 'bg-white/45 text-blue-700 border-white/40 shadow-sm'
                  : 'backdrop-blur-md bg-white/20 text-gray-700 border-white/30 hover:bg-white/35'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- Contenido --- */}
      {activeTab === 'kanban' ? (
        <ClientsKanbanTab
          lineaNegocio={kanbanLine}
          onLineaNegocioChange={setKanbanLine}
          onClientClick={(client) => setDetailClientId(client.id)}
          reloadToken={reloadToken}
          onChanged={() => void refetch()}
        />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-3 md:gap-4 overflow-y-auto">
          {/* En móvil los seis filtros se comían la pantalla entera antes de
              enseñar un solo cliente: van plegados y se abren a demanda. */}
          <CollapsibleFilters className="flex-shrink-0" activos={filtrosActivos}>
            <FilterBar
              fields={filterFields}
              values={filters as unknown as Record<string, FilterValue>}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              onSearch={handleSearch}
            />
          </CollapsibleFilters>

          <div className="backdrop-blur-xl bg-white/20 rounded-lg shadow-lg border border-white/30 overflow-hidden">
            <Table
              data={clients}
              columns={columns}
              isLoading={isLoading}
              onRowClick={(client) => setDetailClientId(client.id)}
              renderMobileCard={renderClientCard}
              emptyMessage={
                isDiscardedTab
                  ? 'No hay clientes descartados.'
                  : 'Todavía no hay clientes. Crea el primero o importa tu agenda.'
              }
            />

            {metadata && metadata.records > 0 && (
              <Pagination
                currentPage={metadata.frame}
                totalPages={metadata.lastFrame}
                pageSize={metadata.frameSize}
                totalRecords={metadata.records}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </div>
      )}

      {/* --- Modales --- */}
      <ClientFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        client={clientToEdit}
        onSaved={reload}
      />

      <ImportClientsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={reload}
      />

      <DiscardClientModal
        isOpen={clientToDiscard !== null}
        onClose={() => setClientToDiscard(null)}
        client={clientToDiscard}
        onDiscarded={() => {
          setDetailClientId(null);
          reload();
        }}
      />

      {detailClientId !== null && (
        <ClientDetailModal
          clientId={detailClientId}
          isOpen
          onClose={() => setDetailClientId(null)}
          onEdit={(client) => {
            setDetailClientId(null);
            openEdit(client);
          }}
          onDiscard={(client) => {
            setDetailClientId(null);
            setClientToDiscard(client);
          }}
          onChanged={reload}
        />
      )}

      <ConfirmDialog
        isOpen={clientToDelete !== null}
        onClose={() => setClientToDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar cliente"
        message={
          clientToDelete
            ? `¿Seguro que quieres eliminar a ${getFullName(clientToDelete)}? Se borrará también todo su historial y no se podrá recuperar.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        isLoading={isSaving}
      />
    </div>
  );
};
