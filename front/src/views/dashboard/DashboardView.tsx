import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiBell,
  FiDollarSign,
  FiEdit3,
  FiHome,
  FiLayers,
  FiMapPin,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';

import { useFetch } from '../../hooks/useFetch';
import { useMutation } from '../../hooks/useMutation';
import { getErrorMessage } from '../../helpers/errorHandler';
import { formatCurrency, formatNumber } from '../../helpers/formatters';
import type { ItResponse } from '../../types/api.types';

import { BusinessLineFunnel } from './components/BusinessLineFunnel';
import { DistributionBars } from './components/DistributionBars';
import { MetricCard } from './components/MetricCard';
import { PendingSignaturesPanel } from './components/PendingSignaturesPanel';
import { RecentActivityPanel } from './components/RecentActivityPanel';
import { TasksPanel } from './components/TasksPanel';
import type { ResumenDashboard } from './dashboard.types';

/** Resultado que devuelve `POST /api/notifications/revisar`. */
interface ResultadoRevision {
  total: number;
}

/** Milisegundos que se sostiene el giro del botón «Actualizar». */
const GIRO_MINIMO = 500;

/** Hora corta («10:32») del resumen recibido, para el botón «Actualizar». */
const formatHora = (valor?: string | null): string | null => {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
};

/**
 * Cuadro de mando de Vantia.
 *
 * Se alimenta de una sola llamada (`GET /api/dashboard/resumen`) que ya trae
 * las etiquetas en español y los porcentajes calculados, de modo que la vista
 * solo compone y pinta.
 *
 * El botón «Revisar» del panel de tareas lanza a mano el mismo motor de reglas
 * que corre cada día a las 8:00 y refresca el resumen: en la demo permite
 * enseñar cómo aparecen las alertas sin esperar al CRON.
 */
export const DashboardView = () => {
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useFetch<ItResponse<ResumenDashboard>>(
    '/dashboard/resumen',
  );

  const resumen = data?.data ?? null;

  // El error de carga se avisa una sola vez por fallo, no en cada renderizado.
  const errorNotificado = useRef<Error | null>(null);
  useEffect(() => {
    if (error && errorNotificado.current !== error) {
      errorNotificado.current = error;
      toast.error(getErrorMessage(error, 'No se pudo cargar el cuadro de mando'));
    }
    if (!error) {
      errorNotificado.current = null;
    }
  }, [error]);

  const { mutate: revisar, loading: revisando } = useMutation<
    ItResponse<ResultadoRevision>
  >('/notifications/revisar', 'POST');

  const handleRevisar = useCallback(async () => {
    const respuesta = await revisar();

    if (!respuesta) {
      toast.error('No se pudo ejecutar la revisión de alertas');
      return;
    }

    toast.success(respuesta.message);
    await refetch();
  }, [revisar, refetch]);

  // El botón «Actualizar» tiene su propio estado: la API responde tan rápido
  // que el `loading` del hook es imperceptible y la persona usuaria cree que no ha
  // pasado nada.
  const [refrescando, setRefrescando] = useState(false);

  const handleActualizar = useCallback(async () => {
    setRefrescando(true);
    const inicio = Date.now();

    await refetch();

    const restante = GIRO_MINIMO - (Date.now() - inicio);
    if (restante > 0) {
      await new Promise((continuar) => window.setTimeout(continuar, restante));
    }
    setRefrescando(false);

    // El efecto de arriba deja `errorNotificado` a null cuando la recarga fue
    // bien, y ya avisa él del fallo cuando no: aquí solo se confirma el acierto.
    if (!errorNotificado.current) {
      toast.success('Panel actualizado', { duration: 1800 });
    }
  }, [refetch]);

  const titulares = resumen?.titulares ?? null;
  const facturacion = resumen?.facturacion ?? null;
  const actualizando = loading || refrescando;
  const horaResumen = formatHora(resumen?.generadoAt);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
      {/* Cabecera */}
      <header className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 drop-shadow-sm">Panel</h1>
          <p className="hidden sm:block text-sm text-gray-700">
            Visión general del negocio: PSI para inversores, alquiler temporal a empresas y
            seguimiento de reformas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {horaResumen && (
            <span className="text-xs text-gray-600 whitespace-nowrap select-none">
              Actualizado a las {horaResumen}
            </span>
          )}

          <button
            type="button"
            onClick={() => void handleActualizar()}
            disabled={actualizando}
            className="inline-flex min-h-11 items-center gap-2 px-4 rounded-lg backdrop-blur-md bg-white/30 border border-white/30 text-sm font-medium text-gray-800 hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer select-none"
          >
            <FiRefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </header>

      {error && !resumen && (
        <div className="backdrop-blur-xl bg-red-50/60 rounded-xl border border-red-200/60 shadow-lg p-4 flex items-start gap-3">
          <FiAlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              No se pudo cargar el cuadro de mando
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              {getErrorMessage(error, 'Revisa la conexión con el servidor y vuelve a intentarlo.')}
            </p>
          </div>
        </div>
      )}

      {/* Titulares */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 md:gap-3">
        <MetricCard
          etiqueta="Clientes activos"
          valor={formatNumber(titulares?.clientesActivos ?? null)}
          icono={FiUsers}
          color="text-blue-700 bg-blue-500/15 border-blue-500/30"
          detalle={
            resumen ? `${resumen.clientes.nuevosMes} alta(s) este mes` : undefined
          }
          loading={loading}
          onClick={() => navigate('/clientes')}
        />
        <MetricCard
          etiqueta="Inmuebles en cartera"
          valor={formatNumber(titulares?.inmueblesCartera ?? null)}
          icono={FiHome}
          color="text-teal-700 bg-teal-500/15 border-teal-500/30"
          detalle={
            resumen ? `${resumen.propiedades.disponibles} disponible(s)` : undefined
          }
          loading={loading}
          onClick={() => navigate('/propiedades')}
        />
        <MetricCard
          etiqueta="Pendientes de firma"
          valor={formatNumber(titulares?.contratosPendientesFirma ?? null)}
          icono={FiEdit3}
          color="text-violet-700 bg-violet-500/15 border-violet-500/30"
          detalle={
            resumen ? `${resumen.contratos.firmadosMes} firmado(s) este mes` : undefined
          }
          loading={loading}
          onClick={() => navigate('/contratos')}
        />
        <MetricCard
          etiqueta="Facturado este mes"
          valor={formatCurrency(titulares?.facturadoMes ?? null)}
          icono={FiDollarSign}
          color="text-emerald-700 bg-emerald-500/15 border-emerald-500/30"
          detalle={facturacion?.etiquetaMes}
          variacion={facturacion?.variacion ?? null}
          loading={loading}
          onClick={() => navigate('/facturas')}
        />
        <MetricCard
          etiqueta="Avisos abiertos"
          valor={formatNumber(titulares?.avisosAbiertos ?? null)}
          icono={FiBell}
          color="text-amber-700 bg-amber-500/15 border-amber-500/30"
          detalle="Prórrogas, firmas y cobros"
          loading={loading}
        />
      </div>

      {/* Embudo comercial y tareas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4">
          <header className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiLayers className="w-5 h-5 text-blue-600" />
              Embudo por línea de negocio
            </h2>
            {resumen && (
              <span className="text-xs text-gray-600">
                Presupuesto medio de los inversores activos:{' '}
                <strong className="text-gray-900 tabular-nums">
                  {formatCurrency(resumen.clientes.presupuestoMedio)}
                </strong>
              </span>
            )}
          </header>

          <BusinessLineFunnel lineas={resumen?.clientes.porLinea ?? []} loading={loading} />

          <div className="mt-6 pt-4 border-t border-white/40">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Clientes por etapa (todas las líneas)
            </h3>
            <DistributionBars
              datos={resumen?.clientes.porEtapa ?? []}
              gradiente="from-blue-500 to-indigo-600"
              loading={loading}
              vacio="Todavía no hay clientes en el pipeline."
            />
          </div>
        </section>

        <TasksPanel
          tareas={resumen?.tareasHoy ?? []}
          loading={loading}
          onRevisar={() => void handleRevisar()}
          revisando={revisando}
        />
      </div>

      {/* Cartera de inmuebles y contratos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4">
          <header className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiHome className="w-5 h-5 text-teal-600" />
              Inmuebles por estado
            </h2>
            {resumen && (
              <span className="text-xs text-gray-600 tabular-nums">
                {formatCurrency(resumen.propiedades.valorCartera)}
              </span>
            )}
          </header>
          <DistributionBars
            datos={resumen?.propiedades.porEstado ?? []}
            gradiente="from-teal-500 to-emerald-600"
            loading={loading}
            vacio="Todavía no hay inmuebles en la cartera."
          />
        </section>

        <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4">
          <header className="mb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiMapPin className="w-5 h-5 text-teal-600" />
              Inmuebles por zona
            </h2>
          </header>
          <DistributionBars
            datos={resumen?.propiedades.porZona ?? []}
            gradiente="from-sky-500 to-teal-600"
            ocultarVacias
            loading={loading}
            vacio="Todavía no hay inmuebles asignados a ninguna zona."
          />
        </section>

        <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4">
          <header className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiEdit3 className="w-5 h-5 text-violet-600" />
              Contratos por estado
            </h2>
            {resumen && (
              <span className="text-xs text-gray-600 tabular-nums">
                {formatNumber(resumen.contratos.total)} en total
              </span>
            )}
          </header>
          <DistributionBars
            datos={resumen?.contratos.porEstado ?? []}
            gradiente="from-violet-500 to-purple-600"
            loading={loading}
            vacio="Todavía no se ha generado ningún contrato."
          />
        </section>
      </div>

      {/* Facturación del mes */}
      <section className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-4">
        <header className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="inline-flex items-center gap-2 text-base font-semibold text-gray-900">
            <FiTrendingUp className="w-5 h-5 text-emerald-600" />
            Facturación de {facturacion?.etiquetaMes ?? 'este mes'}
          </h2>
          {facturacion && (
            <span className="text-xs text-gray-600">
              {formatNumber(facturacion.numeroFacturas)} factura(s) · mes anterior{' '}
              <strong className="text-gray-900 tabular-nums">
                {formatCurrency(facturacion.totalMesAnterior)}
              </strong>
            </span>
          )}
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
          {[
            {
              clave: 'total',
              etiqueta: 'Facturado',
              valor: facturacion?.total,
              color: 'text-blue-700',
            },
            {
              clave: 'cobrado',
              etiqueta: 'Cobrado',
              valor: facturacion?.cobrado,
              color: 'text-emerald-700',
            },
            {
              clave: 'pendiente',
              etiqueta: 'Pendiente',
              valor: facturacion?.pendiente,
              color: 'text-amber-700',
            },
            {
              clave: 'base',
              etiqueta: 'Base imponible',
              valor: facturacion?.baseImponible,
              color: 'text-gray-900',
            },
            {
              clave: 'iva',
              etiqueta: 'IVA repercutido',
              valor: facturacion?.cuotaIva,
              color: 'text-gray-900',
            },
          ].map(({ clave, etiqueta, valor, color }) => (
            <div
              key={clave}
              className="backdrop-blur-md bg-white/40 rounded-lg border border-white/30 p-3"
            >
              <p className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide select-none">
                {etiqueta}
              </p>
              <p className={`mt-1.5 text-lg font-bold tabular-nums ${color}`}>
                {loading && valor === undefined ? '···' : formatCurrency(valor ?? null)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Firmas pendientes y actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PendingSignaturesPanel
          firmas={resumen?.firmasPendientes ?? []}
          loading={loading}
        />
        <RecentActivityPanel
          actividad={resumen?.actividadReciente ?? []}
          loading={loading}
        />
      </div>
    </div>
  );
};
