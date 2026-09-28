import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiAlertTriangle, FiHome, FiPlus, FiRefreshCw, FiTarget, FiX } from 'react-icons/fi';

import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FilterBar } from '../../components/FilterBar';
import { CollapsibleFilters } from '../../components/CollapsibleFilters';
import type { FilterField, FilterValue } from '../../components/FilterBar';
import { Pagination } from '../../components/Pagination';
import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage } from '../../helpers/errorHandler';
import type { ItFindAllResponse, ItResponse } from '../../types/api.types';

import { MatchesPanel } from './components/MatchesPanel';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { PropertyFormModal } from './components/PropertyFormModal';
import { statusOptions, typeOptions, zoneOptions } from './enums/propertyCatalogs';
import { buildPropertiesQuery } from './requests/properties.requests';
import type {
  Property,
  PropertyFilters,
  PropertyPayload,
  PropertyStatus,
  PropertyType,
  PropertyZone,
} from './types/property.types';

type Pestana = 'cartera' | 'coincidencias';

const filterFields: FilterField[] = [
  {
    key: 'search',
    label: 'Buscar',
    type: 'text',
    placeholder: 'Referencia, título o dirección',
  },
  { key: 'zona', label: 'Zona', type: 'select', options: zoneOptions },
  { key: 'estado', label: 'Estado', type: 'select', options: statusOptions },
  { key: 'tipo', label: 'Tipo', type: 'select', options: typeOptions },
  { key: 'precioMin', label: 'Precio desde (€)', type: 'number', placeholder: '80000' },
  { key: 'precioMax', label: 'Precio hasta (€)', type: 'number', placeholder: '250000' },
];

const texto = (valor: FilterValue): string | undefined =>
  typeof valor === 'string' && valor.trim() ? valor.trim() : undefined;

/** Los filtros de importe no admiten negativos: el backend los rechaza. */
const numero = (valor: FilterValue): number | undefined =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : undefined;

/**
 * Cartera de propiedades: rejilla de fichas con foto, estado y precio,
 * alta y edición con subida de fotos, y cruce de coincidencias por cliente.
 */
export const PropertiesView = () => {
  const [pestana, setPestana] = useState<Pestana>('cartera');

  const [filtros, setFiltros] = useState<Record<string, FilterValue>>({});
  const [aplicados, setAplicados] = useState<PropertyFilters>({});
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(12);

  const [detalle, setDetalle] = useState<Property | null>(null);
  const [editando, setEditando] = useState<Property | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<Property | null>(null);

  const url = useMemo(
    () => buildPropertiesQuery(aplicados, pagina, tamano),
    [aplicados, pagina, tamano],
  );

  const { data, loading, error, refetch } = useFetch<ItFindAllResponse<Property>>(url);

  const { mutate: guardarInmueble, loading: guardando } = useMutation<
    ItResponse<Property>,
    PropertyPayload
  >('/properties', 'POST', {
    onError: (fallo) => toast.error(getErrorMessage(fallo, 'No se ha podido guardar el inmueble')),
  });

  const { mutate: eliminarInmueble, loading: eliminando } = useMutation<ItResponse<null>>(
    '/properties',
    'DELETE',
    {
      onError: (fallo) =>
        toast.error(getErrorMessage(fallo, 'No se ha podido eliminar el inmueble')),
    },
  );

  const propiedades = data?.data ?? [];
  const metadata = data?.metadata;

  /** Hay filtros en juego: el estado vacío debe ofrecer limpiarlos, no dar de alta. */
  const hayFiltros = Object.values(aplicados).some(
    (valor) => valor !== undefined && valor !== null && valor !== '',
  );

  const cambiarFiltro = (clave: string, valor: FilterValue) =>
    setFiltros((actual) => ({ ...actual, [clave]: valor }));

  const aplicarFiltros = () => {
    setAplicados({
      search: texto(filtros.search),
      zona: texto(filtros.zona) as PropertyZone | undefined,
      estado: texto(filtros.estado) as PropertyStatus | undefined,
      tipo: texto(filtros.tipo) as PropertyType | undefined,
      precioMin: numero(filtros.precioMin),
      precioMax: numero(filtros.precioMax),
    });
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFiltros({});
    setAplicados({});
    setPagina(1);
  };

  const abrirAlta = () => {
    setEditando(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (property: Property) => {
    setDetalle(null);
    setEditando(property);
    setFormAbierto(true);
  };

  const cerrarFormulario = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  const enviarFormulario = async (payload: PropertyPayload): Promise<boolean> => {
    const respuesta = editando
      ? await guardarInmueble(payload, 'PATCH', `/properties/${editando.id}`)
      : await guardarInmueble(payload, 'POST', '/properties');

    if (!respuesta) return false;

    // Mensajes propios del dominio: «Inmueble creado / actualizado», no el
    // «Actualizado correctamente» genérico del catálogo de flags.
    toast.success(editando ? 'Inmueble actualizado correctamente' : 'Inmueble creado correctamente');
    cerrarFormulario();
    await refetch();
    return true;
  };

  const confirmarEliminacion = async () => {
    if (!aEliminar) return;

    const respuesta = await eliminarInmueble(undefined, 'DELETE', `/properties/${aEliminar.id}`);
    if (!respuesta) return;

    toast.success('Inmueble eliminado correctamente');
    setAEliminar(null);
    if (propiedades.length === 1 && pagina > 1) setPagina(pagina - 1);
    else await refetch();
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <header className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 rounded-xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
                <FiHome className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 drop-shadow-sm">
                  Propiedades
                </h1>
                <p className="hidden sm:block mt-1 text-gray-700">
                  Inventario vivo de la cartera: captación, estado de reforma y disponibilidad.
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={abrirAlta} className="px-3 py-2.5 md:px-6 md:py-3">
              <span className="inline-flex items-center gap-2">
                <FiPlus className="w-4 h-4" />
                Nueva<span className="hidden sm:inline"> propiedad</span>
              </span>
            </Button>
          </div>

          <nav className="mt-4 md:mt-6 flex flex-wrap gap-1 p-1 rounded-xl backdrop-blur-md bg-white/30 border border-white/30">
            <button
              type="button"
              onClick={() => setPestana('cartera')}
              className={`inline-flex min-h-11 items-center gap-2 px-3 md:px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer select-none ${
                pestana === 'cartera'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'text-gray-800 hover:bg-white/40'
              }`}
            >
              <FiHome className="w-4 h-4" />
              Cartera
              {metadata && (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    pestana === 'cartera' ? 'bg-white/25' : 'bg-white/50'
                  }`}
                >
                  {metadata.records}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPestana('coincidencias')}
              className={`inline-flex min-h-11 items-center gap-2 px-3 md:px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer select-none ${
                pestana === 'coincidencias'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'text-gray-800 hover:bg-white/40'
              }`}
            >
              <FiTarget className="w-4 h-4" />
              Coincidencias
            </button>
          </nav>
        </header>

        {pestana === 'cartera' ? (
          <>
            <CollapsibleFilters
              activos={
                Object.values(filtros).filter((valor) => valor !== '' && valor !== undefined)
                  .length
              }
            >
              <FilterBar
                fields={filterFields}
                values={filtros}
                onChange={cambiarFiltro}
                onClear={limpiarFiltros}
                onSearch={aplicarFiltros}
              />
            </CollapsibleFilters>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            )}

            {!loading && error && (
              <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-red-300/50 shadow-lg p-8 text-center">
                <FiAlertTriangle className="w-10 h-10 mx-auto text-red-600" />
                <p className="mt-3 text-base font-semibold text-red-900">
                  {getErrorMessage(error, 'No se ha podido cargar la cartera')}
                </p>
                <Button variant="secondary" className="mt-4" onClick={() => void refetch()}>
                  <span className="inline-flex items-center gap-2">
                    <FiRefreshCw className="w-4 h-4" />
                    Reintentar
                  </span>
                </Button>
              </div>
            )}

            {!loading && !error && propiedades.length === 0 && (
              <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-12 text-center">
                <FiHome className="w-12 h-12 mx-auto text-blue-600/50" />
                <p className="mt-4 text-lg font-semibold text-gray-900">
                  {hayFiltros
                    ? 'Ningún inmueble cumple estos filtros'
                    : 'Todavía no hay inmuebles en la cartera'}
                </p>
                <p className="mt-1 text-gray-700">
                  {hayFiltros
                    ? 'Prueba con otros criterios o vuelve a ver la cartera completa.'
                    : 'Da de alta la primera propiedad para empezar a trabajarla.'}
                </p>
                {hayFiltros ? (
                  <Button variant="secondary" className="mt-5" onClick={limpiarFiltros}>
                    <span className="inline-flex items-center gap-2">
                      <FiX className="w-4 h-4" />
                      Limpiar filtros
                    </span>
                  </Button>
                ) : (
                  <Button variant="primary" className="mt-5" onClick={abrirAlta}>
                    <span className="inline-flex items-center gap-2">
                      <FiPlus className="w-4 h-4" />
                      Nueva propiedad
                    </span>
                  </Button>
                )}
              </div>
            )}

            {!loading && !error && propiedades.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {propiedades.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onView={setDetalle}
                      onEdit={abrirEdicion}
                      onDelete={setAEliminar}
                    />
                  ))}
                </div>

                {metadata && (
                  <div className="backdrop-blur-xl bg-white/20 rounded-lg border border-white/30 shadow-lg overflow-hidden">
                    <Pagination
                      currentPage={metadata.frame}
                      totalPages={metadata.lastFrame}
                      pageSize={metadata.frameSize}
                      totalRecords={metadata.records}
                      onPageChange={setPagina}
                      onPageSizeChange={(nuevo) => {
                        setTamano(nuevo);
                        setPagina(1);
                      }}
                      pageSizeOptions={[12, 24, 48]}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <MatchesPanel onView={setDetalle} />
        )}
      </div>

      <PropertyDetailModal
        property={detalle}
        isOpen={Boolean(detalle)}
        onClose={() => setDetalle(null)}
        onEdit={abrirEdicion}
      />

      <PropertyFormModal
        isOpen={formAbierto}
        property={editando}
        saving={guardando}
        onClose={cerrarFormulario}
        onSubmit={enviarFormulario}
      />

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        onClose={() => setAEliminar(null)}
        onConfirm={() => void confirmarEliminacion()}
        title="Eliminar inmueble"
        message={
          aEliminar
            ? `¿Seguro que quieres eliminar «${aEliminar.titulo}» (${aEliminar.referencia})? También se borrarán sus fotos.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        isLoading={eliminando}
      />
    </div>
  );
};
