import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiInfo, FiSearch, FiSliders, FiTarget, FiUser } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { getErrorMessage } from '../../../helpers/errorHandler';
import { formatCurrencyWhole } from '../../../helpers/formatters';
import {
  PROPERTY_TYPES,
  PROPERTY_ZONES,
  ProfileSourceLabels,
  PropertyTypeLabels,
  PropertyZoneLabels,
} from '../enums/propertyCatalogs';
import { fetchClientOptions, fetchPropertyMatches } from '../requests/properties.requests';
import type {
  ClientOption,
  MatchCriteria,
  Property,
  PropertyMatchResponse,
  PropertyType,
  PropertyZone,
} from '../types/property.types';
import { MatchCard } from './MatchCard';

interface MatchesPanelProps {
  onView: (property: Property) => void;
}

const criteriosVacios: MatchCriteria = {
  zonas: [],
  tipos: [],
  incluirNoDisponibles: false,
};

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/45 border border-white/40 rounded-lg text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50';

const labelClasses = 'block text-sm font-semibold text-gray-900 mb-1.5';

/** Botón conmutable en forma de píldora para zonas y tipos. */
const Pildora = ({
  activo,
  label,
  onClick,
}: {
  activo: boolean;
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activo}
    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors cursor-pointer select-none ${
      activo
        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
        : 'backdrop-blur-md bg-white/40 text-gray-800 border-white/40 hover:bg-white/60'
    }`}
  >
    {label}
  </button>
);

/**
 * Vista «Coincidencias»: cruza el perfil inversor de un cliente con la cartera
 * y muestra las propiedades sugeridas con su puntuación y sus motivos.
 */
export const MatchesPanel = ({ onView }: MatchesPanelProps) => {
  const [clientes, setClientes] = useState<ClientOption[]>([]);
  const [clientesCargados, setClientesCargados] = useState(false);
  const [clientId, setClientId] = useState('');
  const [criterios, setCriterios] = useState<MatchCriteria>(criteriosVacios);
  const [resultado, setResultado] = useState<PropertyMatchResponse | null>(null);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    let vigente = true;

    // Sincronización con la API de clientes (dominio ajeno): si aún no está
    // publicada, la lista queda vacía y se pide el identificador a mano.
    void fetchClientOptions().then((opciones) => {
      if (!vigente) return;
      setClientes(opciones);
      setClientesCargados(true);
    });

    return () => {
      vigente = false;
    };
  }, []);

  const alternarZona = (zona: PropertyZone) =>
    setCriterios((actual) => ({
      ...actual,
      zonas: actual.zonas.includes(zona)
        ? actual.zonas.filter((valor) => valor !== zona)
        : [...actual.zonas, zona],
    }));

  const alternarTipo = (tipo: PropertyType) =>
    setCriterios((actual) => ({
      ...actual,
      tipos: actual.tipos.includes(tipo)
        ? actual.tipos.filter((valor) => valor !== tipo)
        : [...actual.tipos, tipo],
    }));

  const setNumero = (
    campo: 'presupuestoMin' | 'presupuestoMax' | 'habitacionesMin' | 'rentabilidadMin',
    valor: string,
  ) =>
    setCriterios((actual) => {
      const numero = Number(valor.trim().replace(',', '.'));
      return {
        ...actual,
        [campo]: valor.trim() && Number.isFinite(numero) ? numero : undefined,
      };
    });

  const buscar = useCallback(async () => {
    const id = Number(clientId);
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('Selecciona un cliente para buscar coincidencias');
      return;
    }

    setBuscando(true);
    try {
      const datos = await fetchPropertyMatches(id, criterios);
      setResultado(datos);
      if (!datos.coincidencias.length) {
        toast('No hay inmuebles que encajen con ese perfil', { icon: '🔍' });
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se han podido calcular las coincidencias'));
    } finally {
      setBuscando(false);
    }
  }, [clientId, criterios]);

  const limpiar = () => {
    setCriterios(criteriosVacios);
    setResultado(null);
  };

  const perfil = resultado?.perfil;

  return (
    <div className="space-y-5">
      <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-5 space-y-4">
        <header className="flex items-center gap-3">
          <div className="p-2 rounded-lg backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
            <FiTarget className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Coincidencias por cliente</h2>
            <p className="text-sm text-gray-700">
              Cruza el presupuesto, las zonas y el tipo de operación del inversor con la cartera.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className={labelClasses} htmlFor="match-cliente">
              Cliente inversor
            </label>
            {clientes.length > 0 ? (
              <select
                id="match-cliente"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className={`${controlClasses} cursor-pointer`}
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="match-cliente"
                type="number"
                min={1}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder="Identificador del cliente"
                className={controlClasses}
              />
            )}
            {clientesCargados && clientes.length === 0 && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-700">
                <FiInfo className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                La lista de clientes aún no está disponible: introduce el identificador y ajusta
                los criterios a mano.
              </p>
            )}
          </div>

          <div>
            <label className={labelClasses} htmlFor="match-presupuesto-min">
              Presupuesto desde (€)
            </label>
            <input
              id="match-presupuesto-min"
              type="number"
              min={0}
              value={criterios.presupuestoMin ?? ''}
              onChange={(event) => setNumero('presupuestoMin', event.target.value)}
              placeholder="90000"
              className={controlClasses}
            />
          </div>

          <div>
            <label className={labelClasses} htmlFor="match-presupuesto-max">
              Presupuesto hasta (€)
            </label>
            <input
              id="match-presupuesto-max"
              type="number"
              min={0}
              value={criterios.presupuestoMax ?? ''}
              onChange={(event) => setNumero('presupuestoMax', event.target.value)}
              placeholder="200000"
              className={controlClasses}
            />
          </div>

          <div>
            <label className={labelClasses} htmlFor="match-habitaciones">
              Habitaciones mínimas
            </label>
            <input
              id="match-habitaciones"
              type="number"
              min={0}
              value={criterios.habitacionesMin ?? ''}
              onChange={(event) => setNumero('habitacionesMin', event.target.value)}
              placeholder="2"
              className={controlClasses}
            />
          </div>

          <div>
            <label className={labelClasses} htmlFor="match-rentabilidad">
              Rentabilidad mínima (%)
            </label>
            <input
              id="match-rentabilidad"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={criterios.rentabilidadMin ?? ''}
              onChange={(event) => setNumero('rentabilidadMin', event.target.value)}
              placeholder="5.5"
              className={controlClasses}
            />
          </div>

          <div className="lg:col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-900 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={criterios.incluirNoDisponibles}
                onChange={(event) =>
                  setCriterios((actual) => ({
                    ...actual,
                    incluirNoDisponibles: event.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500/50 cursor-pointer"
              />
              Incluir inmuebles alquilados, reservados o traspasados
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className={labelClasses}>Zonas de interés</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_ZONES.map((zona) => (
                <Pildora
                  key={zona}
                  activo={criterios.zonas.includes(zona)}
                  label={PropertyZoneLabels[zona]}
                  onClick={() => alternarZona(zona)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className={labelClasses}>Tipo de inmueble</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((tipo) => (
                <Pildora
                  key={tipo}
                  activo={criterios.tipos.includes(tipo)}
                  label={PropertyTypeLabels[tipo]}
                  onClick={() => alternarTipo(tipo)}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs text-gray-700">
          <FiSliders className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Lo que marques aquí tiene prioridad sobre el perfil guardado en la ficha del cliente.
        </p>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={limpiar} disabled={buscando}>
            Limpiar criterios
          </Button>
          <Button variant="primary" onClick={buscar} isLoading={buscando}>
            <span className="inline-flex items-center gap-2">
              <FiSearch className="w-4 h-4" />
              Buscar coincidencias
            </span>
          </Button>
        </div>
      </section>

      {resultado && perfil && (
        <section className="space-y-4">
          <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-base font-bold text-gray-900">
                <FiUser className="w-4 h-4 text-blue-700" />
                {resultado.cliente ?? `Cliente n.º ${resultado.clientId}`}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-blue-500/15 text-blue-900 border border-blue-600/30">
                {ProfileSourceLabels[perfil.origen] ?? perfil.origen}
              </span>
              <span className="ml-auto text-sm font-medium text-gray-700">
                {resultado.coincidencias.length} de {resultado.evaluadas} inmuebles evaluados
              </span>
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-700">
              <FiInfo className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                {criterios.incluirNoDisponibles
                  ? 'Se evalúa toda la cartera, incluidos los inmuebles reservados, alquilados y traspasados.'
                  : 'Solo se evalúan los inmuebles disponibles o en reforma: los reservados, alquilados y traspasados quedan fuera.'}
                {resultado.descartadas > 0 &&
                  ` ${resultado.descartadas} ${
                    resultado.descartadas === 1
                      ? 'inmueble se ha apartado por no cumplir'
                      : 'inmuebles se han apartado por no cumplir'
                  } los criterios del cliente.`}
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {(perfil.presupuestoMin !== undefined || perfil.presupuestoMax !== undefined) && (
                <span className="px-2.5 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30 text-gray-900 font-medium">
                  Presupuesto:{' '}
                  {perfil.presupuestoMin !== undefined
                    ? formatCurrencyWhole(perfil.presupuestoMin)
                    : 'sin mínimo'}{' '}
                  —{' '}
                  {perfil.presupuestoMax !== undefined
                    ? formatCurrencyWhole(perfil.presupuestoMax)
                    : 'sin máximo'}
                </span>
              )}
              {perfil.zonas.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30 text-gray-900 font-medium">
                  Zonas: {perfil.zonas.map((zona) => PropertyZoneLabels[zona]).join(', ')}
                </span>
              )}
              {perfil.tipos.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30 text-gray-900 font-medium">
                  Tipos: {perfil.tipos.map((tipo) => PropertyTypeLabels[tipo]).join(', ')}
                </span>
              )}
              {perfil.habitacionesMin !== undefined && (
                <span className="px-2.5 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30 text-gray-900 font-medium">
                  Desde {perfil.habitacionesMin} habitaciones
                </span>
              )}
              {perfil.rentabilidadMin !== undefined && (
                <span className="px-2.5 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30 text-gray-900 font-medium">
                  Rentabilidad mínima {perfil.rentabilidadMin} %
                </span>
              )}
            </div>
          </div>

          {resultado.coincidencias.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {resultado.coincidencias.map((match) => (
                <MatchCard
                  key={match.property.id}
                  match={match}
                  onView={onView}
                  sinCriterios={resultado.sinCriterios}
                />
              ))}
            </div>
          ) : (
            <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-10 text-center">
              <FiTarget className="w-10 h-10 mx-auto text-blue-600/50" />
              <p className="mt-3 text-base font-semibold text-gray-900">
                Ningún inmueble encaja con este perfil
              </p>
              <p className="mt-1 text-sm text-gray-700">
                {resultado.descartadas > 0
                  ? `Los ${resultado.evaluadas} inmuebles evaluados se quedan fuera de sus criterios. Amplía el presupuesto o añade más zonas para ver opciones.`
                  : 'Amplía el presupuesto o añade más zonas para ver más opciones.'}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
