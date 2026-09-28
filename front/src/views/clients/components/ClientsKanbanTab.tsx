import { useEffect, useMemo, useRef } from 'react';
import { KanbanBoard } from '../../../components/KanbanBoard';
import { ClientKanbanCard } from './ClientKanbanCard';
import { useClientActions, useClientKanban } from '../hooks/useClients';
import {
  BusinessLineColors,
  BusinessLineLabels,
  BusinessLineList,
  BusinessLineShortLabels,
  getStageAccent,
} from '../enums/clientEnums';
import type { BusinessLine } from '../enums/clientEnums';
import type { Client } from '../requests/clients.requests';

interface ClientsKanbanTabProps {
  lineaNegocio: BusinessLine;
  onLineaNegocioChange: (linea: BusinessLine) => void;
  onClientClick: (client: Client) => void;
  /** Cambia cuando el resto de la vista modifica clientes: fuerza recarga. */
  reloadToken: number;
  /** Avisa al resto de la vista de que el tablero ha cambiado algo. */
  onChanged: () => void;
}

/** Tarjeta del kanban: el cliente más la columna en la que se pinta. */
type KanbanClient = Client & { columnId: string };

/**
 * Kanban de clientes de una línea de negocio.
 * Arrastrar una tarjeta llama a `moveStage`; el movimiento se pinta al
 * instante y solo se recarga el tablero si el servidor lo rechaza.
 */
export const ClientsKanbanTab = ({
  lineaNegocio,
  onLineaNegocioChange,
  onClientClick,
  reloadToken,
  onChanged,
}: ClientsKanbanTabProps) => {
  const {
    columnas,
    clientes,
    isLoading,
    refetch,
    applyOptimisticMove,
    clearOptimisticMoves,
  } = useClientKanban(lineaNegocio);
  const { moveStage } = useClientActions();

  // `refetch` cambia de identidad al cambiar de línea; se guarda en una ref
  // para que el efecto de recarga dependa solo del token y no dispare de más.
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void refetchRef.current();
  }, [reloadToken]);

  const columns = useMemo(
    () =>
      columnas.map((columna) => ({
        id: columna.id as string,
        label: columna.label,
        accentClassName: getStageAccent(columna.id),
      })),
    [columnas],
  );

  const items = useMemo<KanbanClient[]>(
    () => clientes.map((client) => ({ ...client, columnId: client.etapa })),
    [clientes],
  );

  const handleItemMove = async (itemId: number | string, targetColumnId: string) => {
    const clientId = Number(itemId);
    applyOptimisticMove(clientId, targetColumnId);

    const updated = await moveStage(
      clientId,
      { etapa: targetColumnId, lineaNegocio },
      true,
    );

    if (updated) {
      onChanged();
      return;
    }

    // El servidor rechazó el movimiento: se deshace y se recarga el tablero.
    clearOptimisticMoves();
    await refetch();
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* --- Selector de línea de negocio --- */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 backdrop-blur-xl bg-white/20 p-2 md:p-3 rounded-lg shadow-lg border border-white/30">
        <span className="hidden md:inline text-sm font-semibold text-gray-900 mr-1 select-none">
          Línea de negocio:
        </span>

        {BusinessLineList.map((linea) => {
          const isActive = linea === lineaNegocio;
          return (
            <button
              key={linea}
              type="button"
              onClick={() => onLineaNegocioChange(linea)}
              aria-pressed={isActive}
              className={`inline-flex min-h-11 items-center rounded-lg border px-3 md:px-4 text-sm font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? `${BusinessLineColors[linea]} shadow-sm ring-2 ring-blue-500/40`
                  : 'backdrop-blur-md bg-white/30 text-gray-700 border-white/30 hover:bg-white/45'
              }`}
            >
              {/* En móvil no cabe «Alquiler temporal a empresas» tres veces */}
              <span className="md:hidden">{BusinessLineShortLabels[linea]}</span>
              <span className="hidden md:inline">{BusinessLineLabels[linea]}</span>
            </button>
          );
        })}

        <span className="ml-auto text-sm text-gray-700 select-none">
          {items.length} <span className="hidden sm:inline">
            {items.length === 1 ? 'cliente activo' : 'clientes activos'}
          </span>
        </span>
      </div>

      {/* --- Tablero --- */}
      <div className="flex-1 min-h-0">
        <KanbanBoard<KanbanClient>
          columns={columns}
          items={items}
          isLoading={isLoading}
          renderCard={(client) => <ClientKanbanCard client={client} />}
          onItemMove={handleItemMove}
          onItemClick={(client) => onClientClick(client)}
          emptyColumnMessage="Sin clientes en esta etapa"
        />
      </div>
    </div>
  );
};
