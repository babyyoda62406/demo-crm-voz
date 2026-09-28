import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiSearch, FiX } from 'react-icons/fi';
import type { IconType } from 'react-icons';

/** Fila del desplegable, ya normalizada por quien usa el componente. */
export interface SearchOption {
  id: number;
  titulo: string;
  detalle?: string;
}

interface SearchSelectProps {
  id: string;
  label: string;
  placeholder: string;
  icono: IconType;
  seleccionado: SearchOption | null;
  /** Consulta a la API. Se llama con el texto ya recortado. */
  buscar: (texto: string) => Promise<SearchOption[]>;
  onSeleccionar: (opcion: SearchOption | null) => void;
  ayuda?: string;
  vacio?: string;
}

/**
 * Desplegable con buscador para vincular un registro existente (cliente o
 * inmueble) al contrato que se está creando.
 *
 * Busca a partir de dos caracteres y con 300 ms de espera, para no lanzar una
 * petición por tecla.
 */
export const SearchSelect = ({
  id,
  label,
  placeholder,
  icono: Icono,
  seleccionado,
  buscar,
  onSeleccionar,
  ayuda,
  vacio = 'No hay coincidencias',
}: SearchSelectProps) => {
  const [texto, setTexto] = useState('');
  const [opciones, setOpciones] = useState<SearchOption[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  const alEscribir = (valor: string) => {
    setTexto(valor);
    const consulta = valor.trim();
    setCargando(consulta.length >= 2);
    if (consulta.length < 2) {
      setOpciones([]);
      setAbierto(false);
    }
  };

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) return;

    const temporizador = setTimeout(() => {
      void buscar(consulta)
        .then((resultado) => {
          setOpciones(resultado);
          setAbierto(true);
        })
        .finally(() => setCargando(false));
    }, 300);

    return () => clearTimeout(temporizador);
  }, [texto, buscar]);

  // Un clic fuera cierra el desplegable pero no toca lo ya seleccionado.
  useEffect(() => {
    const alPulsarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', alPulsarFuera);
    return () => document.removeEventListener('mousedown', alPulsarFuera);
  }, []);

  const elegir = (opcion: SearchOption) => {
    onSeleccionar(opcion);
    setTexto('');
    setOpciones([]);
    setAbierto(false);
  };

  return (
    <div ref={contenedor} className="relative">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-gray-900 mb-1.5"
      >
        {label}
      </label>

      {seleccionado ? (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg backdrop-blur-md bg-emerald-500/10 border border-emerald-500/40">
          <span className="p-1.5 rounded-lg bg-white/60 text-emerald-700">
            <FiCheck className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {seleccionado.titulo}
            </p>
            {seleccionado.detalle && (
              <p className="text-xs text-gray-600 truncate">
                {seleccionado.detalle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSeleccionar(null)}
            aria-label={`Quitar ${label}`}
            title="Quitar la vinculación"
            className="p-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-white/50 transition-colors cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <Icono className="w-4 h-4" />
          </span>
          <input
            id={id}
            type="text"
            value={texto}
            onChange={(e) => alEscribir(e.target.value)}
            onFocus={() => opciones.length > 0 && setAbierto(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full pl-9 pr-9 py-2 backdrop-blur-md bg-white/50 border border-white/40 rounded-lg text-gray-900 placeholder-gray-500 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {cargando ? (
              <span className="block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : (
              <FiSearch className="w-4 h-4" />
            )}
          </span>
        </div>
      )}

      {ayuda && !seleccionado && (
        <p className="mt-1 text-xs text-gray-600">{ayuda}</p>
      )}

      {abierto && !seleccionado && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-white/50 bg-white/90 backdrop-blur-xl shadow-xl">
          {opciones.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-600">{vacio}</p>
          ) : (
            opciones.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                onClick={() => elegir(opcion)}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-500/10 transition-colors cursor-pointer border-b border-white/60 last:border-0"
              >
                <p className="text-sm font-medium text-gray-900">
                  {opcion.titulo}
                </p>
                {opcion.detalle && (
                  <p className="text-xs text-gray-600">{opcion.detalle}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
