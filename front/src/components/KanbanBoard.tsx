import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import { FiChevronLeft, FiChevronRight, FiMove } from 'react-icons/fi';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIsDesktop } from '../hooks/useMediaQuery';

export interface KanbanColumn {
  id: string;
  label: string;
  accentClassName?: string;
}

export interface KanbanItem {
  id: number | string;
  columnId: string;
}

interface KanbanBoardProps<T extends KanbanItem> {
  columns: KanbanColumn[];
  items: T[];
  renderCard: (item: T) => ReactNode;
  onItemMove: (itemId: number | string, targetColumnId: string) => void;
  onItemClick?: (item: T) => void;
  onColumnReorder?: (columnIds: string[]) => void;
  emptyColumnMessage?: string;
  isLoading?: boolean;
}

const COLUMN_PREFIX = 'column-';

interface SortableCardProps {
  id: number | string;
  onClick?: () => void;
  /** Columnas a las que se puede mandar la tarjeta desde el menú de respaldo. */
  destinos: KanbanColumn[];
  onMover: (columnId: string) => void;
  children: ReactNode;
}

const SortableCard = ({ id, onClick, destinos, onMover, children }: SortableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const [menuAbierto, setMenuAbierto] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card backdrop-blur-md bg-white/30 rounded-lg border border-white/30 hover:bg-white/40 transition-all select-none ${
        isDragging ? 'scale-95' : ''
      }`}
    >
      <div onClick={onClick} className="p-4 cursor-grab active:cursor-grabbing">
        {children}
      </div>

      {/*
        Respaldo del arrastre. Con el dedo, origen y destino casi nunca caben a
        la vez en pantalla, así que la etapa también se cambia desde aquí. En
        escritorio se arrastra y no hace falta.
      */}
      <div className="border-t border-white/30 px-2 py-1.5 lg:hidden">
        <button
          type="button"
          onPointerDown={(evento) => evento.stopPropagation()}
          onTouchStart={(evento) => evento.stopPropagation()}
          onClick={(evento) => {
            evento.stopPropagation();
            setMenuAbierto((abierto) => !abierto);
          }}
          aria-expanded={menuAbierto}
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-sm font-semibold text-blue-800 hover:bg-white/50 transition-colors cursor-pointer"
        >
          <FiMove className="w-4 h-4" />
          Mover a etapa…
        </button>

        {menuAbierto && (
          <ul className="mt-1 space-y-0.5">
            {destinos.map((destino) => (
              <li key={destino.id}>
                <button
                  type="button"
                  onPointerDown={(evento) => evento.stopPropagation()}
                  onTouchStart={(evento) => evento.stopPropagation()}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    setMenuAbierto(false);
                    onMover(destino.id);
                  }}
                  className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-gray-800 hover:bg-white/60 transition-colors cursor-pointer"
                >
                  {destino.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface SortableColumnProps<T extends KanbanItem> {
  column: KanbanColumn;
  columns: KanbanColumn[];
  items: T[];
  renderCard: (item: T) => ReactNode;
  onItemClick?: (item: T) => void;
  onItemMove: (itemId: number | string, targetColumnId: string) => void;
  isDraggingOver: boolean;
  emptyColumnMessage: string;
  /** El arrastre de la cabecera solo se ofrece con ratón. */
  permiteArrastrarCabecera: boolean;
}

function SortableColumn<T extends KanbanItem>({
  column,
  columns,
  items,
  renderCard,
  onItemClick,
  onItemMove,
  isDraggingOver,
  emptyColumnMessage,
  permiteArrastrarCabecera,
}: SortableColumnProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${COLUMN_PREFIX}${column.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const destinos = columns.filter((otra) => otra.id !== column.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-columna-kanban={column.id}
      className={`kanban-column flex flex-col flex-shrink-0 w-[85vw] max-w-80 snap-start sm:w-80 h-full backdrop-blur-xl rounded-xl shadow-lg border-2 transition-all ${
        isDragging
          ? 'scale-95 shadow-2xl border-blue-400'
          : isDraggingOver
            ? 'bg-blue-50/30 border-blue-400'
            : 'bg-white/20 border-white/30'
      }`}
    >
      <div
        {...(permiteArrastrarCabecera ? attributes : {})}
        {...(permiteArrastrarCabecera ? listeners : {})}
        className={`kanban-column-header flex-shrink-0 p-4 pb-3 select-none border-b border-white/20 transition-all ${
          permiteArrastrarCabecera ? 'cursor-grab active:cursor-grabbing' : ''
        } ${isDragging ? 'bg-blue-50/40' : 'hover:bg-white/10'}`}
      >
        <h3
          className={`text-lg font-semibold text-gray-900 ${column.accentClassName ?? ''}`}
        >
          {column.label}
        </h3>
        <span className="text-sm text-gray-600">
          {items.length} {items.length === 1 ? 'elemento' : 'elementos'}
        </span>
      </div>

      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-3">
          <div className="space-y-3">
            {items.map((item) => (
              <SortableCard
                key={item.id}
                id={item.id}
                onClick={() => onItemClick?.(item)}
                destinos={destinos}
                onMover={(columnId) => onItemMove(item.id, columnId)}
              >
                {renderCard(item)}
              </SortableCard>
            ))}
            {items.length === 0 && (
              <div
                className={`text-center py-8 text-sm select-none transition-colors ${
                  isDraggingOver ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}
              >
                {isDraggingOver ? 'Suelta aquí' : emptyColumnMessage}
              </div>
            )}
          </div>
        </div>
      </SortableContext>
    </div>
  );
}

/**
 * Tablero Kanban genérico (dnd-kit): columnas reordenables, tarjetas
 * arrastrables entre columnas y desplazamiento horizontal con arrastre del fondo.
 *
 * En móvil cada columna ocupa el ancho de la pantalla con anclaje de
 * desplazamiento, una barra de navegación indica en cuál estás de cuántas, y la
 * tarjeta lleva su propio menú «Mover a etapa…» porque arrastrar con el dedo
 * entre dos columnas que no caben juntas es imposible.
 */
export function KanbanBoard<T extends KanbanItem>({
  columns,
  items,
  renderCard,
  onItemMove,
  onItemClick,
  onColumnReorder,
  emptyColumnMessage = 'Sin elementos',
  isLoading = false,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<number | string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  // Orden personalizado tras arrastrar columnas; `null` = orden recibido por props.
  const [customColumnOrder, setCustomColumnOrder] = useState<string[] | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, scrollLeft: 0 });
  const [columnaVisible, setColumnaVisible] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const esEscritorio = useIsDesktop();

  // El orden se deriva en render: si llegan columnas nuevas se añaden al final
  // y las que desaparecen se descartan, sin necesidad de sincronizar con efectos.
  const incomingColumnIds = columns.map((column) => column.id);
  const columnOrder = customColumnOrder
    ? [
        ...customColumnOrder.filter((id) => incomingColumnIds.includes(id)),
        ...incomingColumnIds.filter((id) => !customColumnOrder.includes(id)),
      ]
    : incomingColumnIds;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Con el dedo hay que distinguir «arrastrar una tarjeta» de «desplazar el
    // tablero»: se exige mantener pulsado un cuarto de segundo.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const getItemsByColumn = (columnId: string) => items.filter((item) => item.columnId === columnId);

  const resolveColumnId = (overId: number | string | null): string | null => {
    if (overId === null) return null;
    if (typeof overId === 'string' && overId.startsWith(COLUMN_PREFIX)) {
      return overId.slice(COLUMN_PREFIX.length);
    }
    const overItem = items.find((item) => item.id === overId);
    return overItem ? overItem.columnId : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverColumnId(resolveColumnId(event.over ? event.over.id : null));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const activeIdValue = active.id;
    const overIdValue = over.id;

    // Reordenación de columnas
    if (
      typeof activeIdValue === 'string' &&
      typeof overIdValue === 'string' &&
      activeIdValue.startsWith(COLUMN_PREFIX) &&
      overIdValue.startsWith(COLUMN_PREFIX)
    ) {
      const activeIndex = columnOrder.indexOf(activeIdValue.slice(COLUMN_PREFIX.length));
      const overIndex = columnOrder.indexOf(overIdValue.slice(COLUMN_PREFIX.length));
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const newOrder = arrayMove(columnOrder, activeIndex, overIndex);
        setCustomColumnOrder(newOrder);
        onColumnReorder?.(newOrder);
      }
      return;
    }

    // Movimiento de tarjetas entre columnas
    const targetColumnId = resolveColumnId(overIdValue);
    const movedItem = items.find((item) => item.id === activeIdValue);
    if (targetColumnId && movedItem && movedItem.columnId !== targetColumnId) {
      onItemMove(activeIdValue, targetColumnId);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverColumnId(null);
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const walk = (e.clientX - rect.left - panStart.x) * 1.5;
      containerRef.current.scrollLeft = panStart.scrollLeft - walk;
    };

    const handleMouseUp = () => setIsPanning(false);

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isPanning, panStart]);

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const clickedCard = target.closest('.kanban-card');
    const clickedHeader = target.closest('.kanban-column-header');

    if (!clickedCard && !clickedHeader && containerRef.current) {
      e.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      setIsPanning(true);
      setPanStart({ x: e.clientX - rect.left, scrollLeft: containerRef.current.scrollLeft });
    }
  };

  /** Índice de la columna que ocupa el tablero, para el indicador de posición. */
  const alDesplazar = useCallback(() => {
    const contenedor = containerRef.current;
    if (!contenedor) return;

    const primera = contenedor.firstElementChild as HTMLElement | null;
    const paso = primera ? primera.offsetWidth + 16 : contenedor.clientWidth;
    setColumnaVisible(Math.round(contenedor.scrollLeft / Math.max(paso, 1)));
  }, []);

  /** Lleva el tablero a la columna indicada (flechas del indicador). */
  const irAColumna = (indice: number) => {
    const contenedor = containerRef.current;
    if (!contenedor) return;

    const destino = contenedor.children[indice] as HTMLElement | undefined;
    if (destino) contenedor.scrollTo({ left: destino.offsetLeft, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const activeItem = items.find((item) => item.id === activeId) ?? null;
  const orderedColumns = columnOrder
    .map((columnId) => columns.find((column) => column.id === columnId))
    .filter((column): column is KanbanColumn => column !== undefined);

  const indiceActual = Math.min(columnaVisible, Math.max(orderedColumns.length - 1, 0));
  const columnaActual = orderedColumns[indiceActual];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div
          ref={containerRef}
          onScroll={alDesplazar}
          className="kanban-container flex gap-4 overflow-x-auto overflow-y-hidden flex-1 min-h-0 relative snap-x snap-mandatory lg:snap-none"
          style={{ scrollbarWidth: 'none' }}
          onMouseDown={handleMouseDown}
        >
          <SortableContext
            items={orderedColumns.map((column) => `${COLUMN_PREFIX}${column.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {orderedColumns.map((column) => (
              <SortableColumn
                key={column.id}
                column={column}
                columns={orderedColumns}
                items={getItemsByColumn(column.id)}
                renderCard={renderCard}
                onItemClick={onItemClick}
                onItemMove={onItemMove}
                isDraggingOver={activeItem !== null && overColumnId === column.id}
                emptyColumnMessage={emptyColumnMessage}
                permiteArrastrarCabecera={esEscritorio && Boolean(onColumnReorder)}
              />
            ))}
          </SortableContext>
        </div>

        {/* Indicador de columnas: sin él, un pipeline de 9 etapas parece de 1. */}
        {orderedColumns.length > 1 && (
          <div className="flex-shrink-0 flex items-center justify-between gap-2 rounded-lg backdrop-blur-md bg-white/25 border border-white/30 px-2 py-1 lg:hidden">
            <button
              type="button"
              onClick={() => irAColumna(Math.max(indiceActual - 1, 0))}
              disabled={indiceActual === 0}
              aria-label="Etapa anterior"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-800 disabled:opacity-30 hover:bg-white/50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>

            <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-gray-900 select-none">
              {columnaActual?.label}
              <span className="ml-1.5 font-medium text-gray-600">
                {indiceActual + 1}/{orderedColumns.length}
              </span>
            </span>

            <button
              type="button"
              onClick={() =>
                irAColumna(Math.min(indiceActual + 1, orderedColumns.length - 1))
              }
              disabled={indiceActual >= orderedColumns.length - 1}
              aria-label="Etapa siguiente"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-800 disabled:opacity-30 hover:bg-white/50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="backdrop-blur-md bg-white/90 rounded-lg p-4 border-2 border-blue-500 shadow-2xl w-[80vw] max-w-80 rotate-2">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
