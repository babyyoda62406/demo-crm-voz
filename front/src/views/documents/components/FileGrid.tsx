import { useRef } from 'react';
import { FiCheck, FiMoreVertical, FiSearch, FiUploadCloud } from 'react-icons/fi';
import { Table } from '../../../components/Table';
import type { Column } from '../../../components/Table';
import { formatDateTime } from '../../../helpers/formatters';
import { formatearTamano, getEstiloTipoFichero } from '../documents.helpers';
import { TIPO_ARRASTRE_FICHERO } from './FolderTree';
import type { FileDoc } from '../documents.types';

/** Teclas que acompañan al clic y deciden si abre o selecciona. */
export interface ModificadoresClic {
  /** Ctrl en Windows/Linux, Cmd en macOS: alterna la selección de uno. */
  ctrl: boolean;
  /** Selecciona el rango desde el último elemento marcado. */
  shift: boolean;
}

interface FileGridProps {
  ficheros: FileDoc[];
  vista: 'grid' | 'lista';
  cargando: boolean;
  /** Ids de los documentos seleccionados para las acciones en masa. */
  seleccionados: Set<number>;
  onAbrir: (fichero: FileDoc) => void;
  /** Clic simple: la vista decide si abre, alterna o extiende la selección. */
  onClicFichero: (fichero: FileDoc, modificadores: ModificadoresClic) => void;
  /** Marca o desmarca un documento sin abrirlo. */
  onAlternarSeleccion: (fichero: FileDoc) => void;
  /** Clic en el fondo de la zona de documentos: deshace la selección. */
  onLimpiarSeleccion: () => void;
  onMenu: (fichero: FileDoc, x: number, y: number) => void;
  /** Búsqueda en curso. Sin resultados, cambia el estado vacío que se pinta. */
  busqueda?: string;
  onLimpiarBusqueda: () => void;
}

/** Arranca el arrastre de un documento hacia una carpeta del árbol. */
const iniciarArrastre = (evento: React.DragEvent, fichero: FileDoc) => {
  evento.dataTransfer.setData(TIPO_ARRASTRE_FICHERO, String(fichero.id));
  evento.dataTransfer.effectAllowed = 'move';
};

const EstadoVacio = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <span className="rounded-2xl border border-white/40 backdrop-blur-md bg-white/40 p-5">
      <FiUploadCloud className="h-10 w-10 text-blue-500/80" />
    </span>
    <p className="select-none text-base font-semibold text-gray-800">
      Esta carpeta está vacía
    </p>
    <p className="max-w-sm select-none text-sm text-gray-600">
      Arrastra aquí los archivos o usa el botón «Subir archivos» para añadir notas simples,
      planos, presupuestos o contratos.
    </p>
  </div>
);

/**
 * Estado vacío de una búsqueda sin resultados.
 * Se distingue del anterior a propósito: con la carpeta llena detrás, leer
 * «Esta carpeta está vacía» da la sensación de que los documentos se han borrado.
 */
const SinResultados = ({ termino, onLimpiar }: { termino: string; onLimpiar: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <span className="rounded-2xl border border-white/40 backdrop-blur-md bg-white/40 p-5">
      <FiSearch className="h-10 w-10 text-gray-500" />
    </span>
    <p className="max-w-md select-none break-words text-base font-semibold text-gray-800">
      Ningún documento coincide con «{termino}»
    </p>
    <p className="max-w-sm select-none text-sm text-gray-600">
      Prueba con menos palabras: la búsqueda no distingue mayúsculas ni tildes.
    </p>
    <button
      type="button"
      onClick={onLimpiar}
      className="cursor-pointer select-none rounded-lg border border-white/40 backdrop-blur-md bg-white/50 px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-white/80"
    >
      Limpiar la búsqueda
    </button>
  </div>
);

/**
 * Zona central del Drive: los documentos de la carpeta actual.
 * En modo cuadrícula se pintan tarjetas de cristal; en modo lista se reutiliza
 * la tabla común del proyecto.
 *
 * Selección múltiple: Ctrl/Cmd+clic marca sueltos, Mayús+clic marca el rango y
 * el clic normal abre. La tabla común solo entrega la fila pulsada, no el
 * evento, así que las teclas se recogen del `mousedown` previo —que siempre
 * ocurre antes del `click`— y se pasan a la vista.
 */
export const FileGrid = ({
  ficheros,
  vista,
  cargando,
  seleccionados,
  onAbrir,
  onClicFichero,
  onAlternarSeleccion,
  onLimpiarSeleccion,
  onMenu,
  busqueda = '',
  onLimpiarBusqueda,
}: FileGridProps) => {
  const modificadores = useRef<ModificadoresClic>({ ctrl: false, shift: false });

  const anotarModificadores = (evento: React.MouseEvent) => {
    modificadores.current = {
      ctrl: evento.ctrlKey || evento.metaKey,
      shift: evento.shiftKey,
    };
  };

  /** Clic en el hueco entre tarjetas o bajo la tabla: se deshace la selección. */
  const alClicarFondo = (evento: React.MouseEvent) => {
    if (evento.target === evento.currentTarget) onLimpiarSeleccion();
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (ficheros.length === 0) {
    return busqueda ? (
      <SinResultados termino={busqueda} onLimpiar={onLimpiarBusqueda} />
    ) : (
      <EstadoVacio />
    );
  }

  if (vista === 'lista') {
    const columnas: Column<FileDoc>[] = [
      {
        key: 'seleccion',
        header: '',
        className: 'w-10',
        render: (fichero) => {
          const seleccionado = seleccionados.has(fichero.id);

          return (
            <button
              type="button"
              // El atributo marca la fila para el resaltado con `:has()`: la
              // tabla común no admite clases por fila.
              data-seleccionado={seleccionado ? 'true' : undefined}
              aria-pressed={seleccionado}
              aria-label={
                seleccionado
                  ? `Quitar ${fichero.nombre} de la selección`
                  : `Seleccionar ${fichero.nombre}`
              }
              onClick={(evento) => {
                evento.stopPropagation();
                onAlternarSeleccion(fichero);
              }}
              className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                seleccionado
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-400/70 bg-white/50 text-transparent hover:border-blue-500 hover:text-blue-500/40'
              }`}
            >
              <FiCheck className="h-3.5 w-3.5" />
            </button>
          );
        },
      },
      {
        key: 'nombre',
        header: 'Nombre',
        render: (fichero) => {
          const estilo = getEstiloTipoFichero(fichero.nombre);
          return (
            <div className="flex items-center gap-2.5">
              <span className={`rounded-lg border p-1.5 ${estilo.fondo}`}>
                <estilo.Icono className={`h-4 w-4 ${estilo.color}`} />
              </span>
              <span className="font-medium">{fichero.nombre}</span>
            </div>
          );
        },
      },
      {
        key: 'tipo',
        header: 'Tipo',
        render: (fichero) => getEstiloTipoFichero(fichero.nombre).etiqueta,
      },
      {
        key: 'tamano',
        header: 'Tamaño',
        render: (fichero) => formatearTamano(fichero.tamano),
      },
      {
        key: 'updatedAt',
        header: 'Modificado',
        render: (fichero) => formatDateTime(fichero.updatedAt),
      },
      {
        key: 'acciones',
        header: '',
        className: 'w-12 text-right',
        render: (fichero) => (
          <button
            type="button"
            aria-label={`Opciones de ${fichero.nombre}`}
            onClick={(evento) => {
              evento.stopPropagation();
              onMenu(fichero, evento.clientX, evento.clientY);
            }}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/60 hover:text-gray-900"
          >
            <FiMoreVertical className="h-4 w-4" />
          </button>
        ),
      },
    ];

    /** Fila del Drive en móvil: la tabla de cinco columnas no cabe en 390 px. */
    const tarjetaMovil = (fichero: FileDoc) => {
      const estilo = getEstiloTipoFichero(fichero.nombre);
      const seleccionado = seleccionados.has(fichero.id);

      return (
        <div className={`flex items-center gap-3 ${seleccionado ? 'opacity-100' : ''}`}>
          <button
            type="button"
            aria-pressed={seleccionado}
            aria-label={
              seleccionado
                ? `Quitar ${fichero.nombre} de la selección`
                : `Seleccionar ${fichero.nombre}`
            }
            onClick={(evento) => {
              evento.stopPropagation();
              onAlternarSeleccion(fichero);
            }}
            className={`flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
              seleccionado
                ? 'border-blue-600 bg-blue-600 text-white'
                : `${estilo.fondo} text-transparent`
            }`}
          >
            {seleccionado ? (
              <FiCheck className="h-5 w-5" />
            ) : (
              <estilo.Icono className={`h-5 w-5 ${estilo.color}`} />
            )}
          </button>

          <div
            onClick={() => onAbrir(fichero)}
            className="min-w-0 flex-1 cursor-pointer"
          >
            <p className="break-words text-sm font-semibold text-gray-900">{fichero.nombre}</p>
            <p className="text-xs text-gray-600">
              {estilo.etiqueta} · {formatearTamano(fichero.tamano)} ·{' '}
              {formatDateTime(fichero.updatedAt)}
            </p>
          </div>

          <button
            type="button"
            aria-label={`Opciones de ${fichero.nombre}`}
            onClick={(evento) => {
              evento.stopPropagation();
              onMenu(fichero, evento.clientX, evento.clientY);
            }}
            className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-white/60 hover:text-gray-900"
          >
            <FiMoreVertical className="h-5 w-5" />
          </button>
        </div>
      );
    };

    return (
      <div
        onContextMenu={(evento) => evento.preventDefault()}
        onMouseDownCapture={anotarModificadores}
        onClick={alClicarFondo}
        className="overflow-hidden rounded-lg border border-white/30 [&_tbody_tr:has([data-seleccionado])]:bg-blue-50/60 [&_tbody_tr:has([data-seleccionado])>td:first-child]:shadow-[inset_3px_0_0_0_#2563eb]"
      >
        <Table
          data={ficheros}
          columns={columnas}
          renderMobileCard={tarjetaMovil}
          onRowClick={(fichero) => onClicFichero(fichero, modificadores.current)}
        />
      </div>
    );
  }

  return (
    <div
      onClick={alClicarFondo}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {ficheros.map((fichero) => {
        const estilo = getEstiloTipoFichero(fichero.nombre);
        const seleccionado = seleccionados.has(fichero.id);

        return (
          <article
            key={fichero.id}
            draggable
            data-fichero-id={fichero.id}
            data-seleccionado={seleccionado ? 'true' : undefined}
            aria-selected={seleccionado}
            onDragStart={(evento) => iniciarArrastre(evento, fichero)}
            onDoubleClick={() => onAbrir(fichero)}
            onClick={(evento) => {
              anotarModificadores(evento);
              onClicFichero(fichero, modificadores.current);
            }}
            onContextMenu={(evento) => {
              evento.preventDefault();
              onMenu(fichero, evento.clientX, evento.clientY);
            }}
            className={`group relative flex cursor-pointer select-none flex-col items-center gap-2 rounded-xl border backdrop-blur-md p-4 text-center shadow-sm transition-all ${
              seleccionado
                ? 'border-blue-400/60 bg-blue-50/60 shadow-lg ring-2 ring-blue-600'
                : 'border-white/30 bg-white/30 hover:-translate-y-0.5 hover:bg-white/50 hover:shadow-lg'
            }`}
          >
            {seleccionado && (
              <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-white shadow">
                <FiCheck className="h-3.5 w-3.5" />
              </span>
            )}

            <button
              type="button"
              aria-label={`Opciones de ${fichero.nombre}`}
              onClick={(evento) => {
                evento.stopPropagation();
                onMenu(fichero, evento.clientX, evento.clientY);
              }}
              className="absolute right-1 top-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-opacity hover:bg-white/70 hover:text-gray-900 lg:opacity-0 lg:group-hover:opacity-100"
            >
              <FiMoreVertical className="h-4 w-4" />
            </button>

            <span className={`rounded-xl border p-3 ${estilo.fondo}`}>
              <estilo.Icono className={`h-7 w-7 ${estilo.color}`} />
            </span>

            <p className="w-full break-words text-sm font-semibold leading-tight text-gray-900 line-clamp-2">
              {fichero.nombre}
            </p>
            <p className="text-xs font-medium text-gray-600">
              {formatearTamano(fichero.tamano)}
              {fichero.version > 1 && ` · v${fichero.version}`}
            </p>
          </article>
        );
      })}
    </div>
  );
};
