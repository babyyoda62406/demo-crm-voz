import { useState } from 'react';
import {
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiFolderPlus,
  FiHardDrive,
  FiMoreVertical,
} from 'react-icons/fi';
import type { FolderNode } from '../documents.types';

/** Identificador que viaja en el drag&drop interno de documentos. */
export const TIPO_ARRASTRE_FICHERO = 'application/x-crmia-documento';

interface FolderTreeProps {
  nodos: FolderNode[];
  carpetaActiva: number | null;
  onSeleccionar: (folderId: number | null) => void;
  onMenuCarpeta: (nodo: FolderNode, x: number, y: number) => void;
  onNuevaCarpeta: (parentId: number | null) => void;
  /** Suelta de un documento sobre una carpeta: lo mueve allí. */
  onSoltarFichero: (fileId: number, folderId: number | null) => void;
  cargando?: boolean;
  /** Etiqueta del nodo raíz. Cambia en la vista filtrada por cliente. */
  etiquetaRaiz?: string;
}

interface NodoProps {
  nodo: FolderNode;
  nivel: number;
  carpetaActiva: number | null;
  onSeleccionar: (folderId: number) => void;
  onMenuCarpeta: (nodo: FolderNode, x: number, y: number) => void;
  onSoltarFichero: (fileId: number, folderId: number) => void;
}

const NodoCarpeta = ({
  nodo,
  nivel,
  carpetaActiva,
  onSeleccionar,
  onMenuCarpeta,
  onSoltarFichero,
}: NodoProps) => {
  const [abierto, setAbierto] = useState(nivel === 0);
  const [sobreDestino, setSobreDestino] = useState(false);
  const tieneHijos = nodo.hijos.length > 0;
  const activo = carpetaActiva === nodo.id;

  return (
    <li>
      <div
        onClick={() => onSeleccionar(nodo.id)}
        onContextMenu={(evento) => {
          evento.preventDefault();
          onMenuCarpeta(nodo, evento.clientX, evento.clientY);
        }}
        onDragOver={(evento) => {
          if (!evento.dataTransfer.types.includes(TIPO_ARRASTRE_FICHERO)) return;
          evento.preventDefault();
          setSobreDestino(true);
        }}
        onDragLeave={() => setSobreDestino(false)}
        onDrop={(evento) => {
          const dato = evento.dataTransfer.getData(TIPO_ARRASTRE_FICHERO);
          setSobreDestino(false);
          if (!dato) return;
          evento.preventDefault();
          onSoltarFichero(Number(dato), nodo.id);
        }}
        style={{ paddingLeft: `${nivel * 14 + 8}px` }}
        className={`group flex cursor-pointer select-none items-center gap-1.5 rounded-lg py-2 pr-2 text-sm transition-colors ${
          activo
            ? 'bg-blue-600/15 font-semibold text-blue-900 border border-blue-300/50'
            : 'border border-transparent text-gray-800 hover:bg-white/40'
        } ${sobreDestino ? 'ring-2 ring-blue-500/60 bg-blue-50/60' : ''}`}
      >
        <button
          type="button"
          aria-label={abierto ? 'Contraer' : 'Desplegar'}
          onClick={(evento) => {
            evento.stopPropagation();
            setAbierto((valor) => !valor);
          }}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-white/60 hover:text-gray-900 xl:h-6 xl:w-6 ${
            tieneHijos ? 'cursor-pointer' : 'invisible'
          }`}
        >
          {abierto ? <FiChevronDown className="h-4 w-4" /> : <FiChevronRight className="h-4 w-4" />}
        </button>

        <FiFolder
          className={`h-4 w-4 flex-shrink-0 ${activo ? 'text-blue-600' : 'text-blue-500/80'}`}
        />
        <span className="truncate">{nodo.nombre}</span>

        {nodo.totalFicheros > 0 && (
          <span className="ml-auto rounded-full bg-white/60 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
            {nodo.totalFicheros}
          </span>
        )}

        <button
          type="button"
          aria-label={`Opciones de ${nodo.nombre}`}
          onClick={(evento) => {
            evento.stopPropagation();
            onMenuCarpeta(nodo, evento.clientX, evento.clientY);
          }}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-opacity hover:bg-white/60 hover:text-gray-900 cursor-pointer xl:h-7 xl:w-7 xl:opacity-0 xl:group-hover:opacity-100 ${
            nodo.totalFicheros > 0 ? '' : 'ml-auto'
          }`}
        >
          <FiMoreVertical className="h-4 w-4" />
        </button>
      </div>

      {abierto && tieneHijos && (
        <ul className="space-y-0.5">
          {nodo.hijos.map((hijo) => (
            <NodoCarpeta
              key={hijo.id}
              nodo={hijo}
              nivel={nivel + 1}
              carpetaActiva={carpetaActiva}
              onSeleccionar={onSeleccionar}
              onMenuCarpeta={onMenuCarpeta}
              onSoltarFichero={onSoltarFichero}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * Panel izquierdo del Drive: árbol de carpetas.
 * Acepta que se le suelten documentos encima para moverlos de carpeta.
 */
export const FolderTree = ({
  nodos,
  carpetaActiva,
  onSeleccionar,
  onMenuCarpeta,
  onNuevaCarpeta,
  onSoltarFichero,
  cargando = false,
  etiquetaRaiz = 'Todo el Drive',
}: FolderTreeProps) => {
  const [sobreRaiz, setSobreRaiz] = useState(false);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/30 backdrop-blur-xl bg-white/20 shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b border-white/30 px-3 py-3">
        <h2 className="select-none text-sm font-bold uppercase tracking-wider text-gray-700">
          Carpetas
        </h2>
        <button
          type="button"
          onClick={() => onNuevaCarpeta(carpetaActiva)}
          title="Nueva carpeta"
          aria-label="Nueva carpeta"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/30 backdrop-blur-md bg-white/40 text-blue-600 transition-colors hover:bg-white/60 cursor-pointer select-none xl:min-h-9 xl:min-w-9"
        >
          <FiFolderPlus className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div
          onClick={() => onSeleccionar(null)}
          onDragOver={(evento) => {
            if (!evento.dataTransfer.types.includes(TIPO_ARRASTRE_FICHERO)) return;
            evento.preventDefault();
            setSobreRaiz(true);
          }}
          onDragLeave={() => setSobreRaiz(false)}
          onDrop={(evento) => {
            const dato = evento.dataTransfer.getData(TIPO_ARRASTRE_FICHERO);
            setSobreRaiz(false);
            if (!dato) return;
            evento.preventDefault();
            onSoltarFichero(Number(dato), null);
          }}
          className={`mb-1 flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
            carpetaActiva === null
              ? 'border border-blue-300/50 bg-blue-600/15 font-semibold text-blue-900'
              : 'border border-transparent text-gray-800 hover:bg-white/40'
          } ${sobreRaiz ? 'ring-2 ring-blue-500/60 bg-blue-50/60' : ''}`}
        >
          <FiHardDrive className="h-4 w-4 flex-shrink-0 text-blue-600" />
          <span className="truncate">{etiquetaRaiz}</span>
        </div>

        {cargando && (
          <div className="flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        )}

        {!cargando && nodos.length === 0 && (
          <p className="select-none px-2 py-4 text-center text-sm text-gray-500">
            Todavía no hay carpetas
          </p>
        )}

        <ul className="space-y-0.5">
          {nodos.map((nodo) => (
            <NodoCarpeta
              key={nodo.id}
              nodo={nodo}
              nivel={0}
              carpetaActiva={carpetaActiva}
              onSeleccionar={onSeleccionar}
              onMenuCarpeta={onMenuCarpeta}
              onSoltarFichero={onSoltarFichero}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
};
