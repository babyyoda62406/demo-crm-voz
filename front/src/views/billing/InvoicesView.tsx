import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDollarSign,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFilePlus,
  FiPlus,
  FiRefreshCw,
  FiRotateCcw,
  FiSlash,
  FiUsers,
} from 'react-icons/fi';

import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FilterBar } from '../../components/FilterBar';
import type { FilterField, FilterValue } from '../../components/FilterBar';
import { CollapsibleFilters } from '../../components/CollapsibleFilters';
import { Pagination } from '../../components/Pagination';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { useFetch } from '../../hooks/useFetch';
import { getErrorMessage } from '../../helpers/errorHandler';
import { getSuccessMessage } from '../../helpers/successHandler';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import type { ItFindAllResponse, ItResponse } from '../../types/api.types';

import { ClientInvoiceHistory } from './ClientInvoiceHistory';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { InvoiceFormModal } from './InvoiceFormModal';
import { InvoiceFromContractModal } from './InvoiceFromContractModal';
import { InvoiceMarkPaidModal } from './InvoiceMarkPaidModal';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoiceSummaryCards } from './InvoiceSummaryCards';
import {
  buildInvoiceQuery,
  fetchClientOptions,
  fetchContractOptions,
  invoiceRequests,
} from './invoices.requests';
import { InvoiceStatus, InvoiceStatusLabels } from './invoice.types';
import type {
  ClientOption,
  ContractOption,
  Invoice,
  InvoiceFilters,
  InvoiceFromContractPayload,
  InvoicePayload,
  InvoiceStatusType,
  InvoiceSummary,
} from './invoice.types';

type Pestana = 'listado' | 'cliente';

const estadoOptions = (Object.values(InvoiceStatus) as InvoiceStatusType[]).map((estado) => ({
  value: estado,
  label: InvoiceStatusLabels[estado],
}));

/** Botón de acción de una fila: 44 px con el dedo, compacto con el ratón. */
const CLASE_ACCION =
  'inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center rounded-lg transition-colors cursor-pointer';

const texto = (valor: FilterValue): string | undefined =>
  typeof valor === 'string' && valor.trim() ? valor.trim() : undefined;

const entero = (valor: FilterValue): number | undefined => {
  if (valor === undefined || valor === '') return undefined;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : undefined;
};

/**
 * Facturación: emisión numerada, seguimiento de cobros y totales del periodo.
 *
 * La pestaña «Listado» comparte exactamente los mismos filtros entre la tabla y
 * el bloque de totales, de modo que las cifras de arriba siempre corresponden a
 * las facturas de abajo.
 */
export const InvoicesView = () => {
  const [pestana, setPestana] = useState<Pestana>('listado');

  const [filtros, setFiltros] = useState<Record<string, FilterValue>>({});
  const [aplicados, setAplicados] = useState<InvoiceFilters>({});
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(10);

  const [clientes, setClientes] = useState<ClientOption[]>([]);
  const [contratos, setContratos] = useState<ContractOption[]>([]);

  const [formAbierto, setFormAbierto] = useState(false);
  const [desdeContratoAbierto, setDesdeContratoAbierto] = useState(false);
  const [editando, setEditando] = useState<Invoice | null>(null);
  const [detalle, setDetalle] = useState<Invoice | null>(null);
  const [aAnular, setAAnular] = useState<Invoice | null>(null);
  const [aCobrar, setACobrar] = useState<Invoice | null>(null);
  const [aDescobrar, setADescobrar] = useState<Invoice | null>(null);

  const [guardando, setGuardando] = useState(false);
  const [emitiendo, setEmitiendo] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [cobrandoId, setCobrandoId] = useState<number | null>(null);

  const urlListado = useMemo(
    () => `/billing/invoice${buildInvoiceQuery({ ...aplicados, page: pagina, size: tamano })}`,
    [aplicados, pagina, tamano],
  );

  const urlResumen = useMemo(
    () => `/billing/invoice/resumen${buildInvoiceQuery(aplicados)}`,
    [aplicados],
  );

  const { data, loading, error, refetch } = useFetch<ItFindAllResponse<Invoice>>(urlListado);
  const { data: resumen, refetch: refetchResumen } =
    useFetch<ItResponse<InvoiceSummary>>(urlResumen);

  // Los desplegables de cliente y contrato se cargan una sola vez: son listas
  // de apoyo y no deben re-pedirse en cada cambio de filtro.
  useEffect(() => {
    let vigente = true;

    void (async () => {
      const [opcionesCliente, opcionesContrato] = await Promise.all([
        fetchClientOptions(),
        fetchContractOptions(),
      ]);

      if (!vigente) return;
      setClientes(opcionesCliente);
      setContratos(opcionesContrato);
    })();

    return () => {
      vigente = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    await Promise.all([refetch(), refetchResumen()]);
  }, [refetch, refetchResumen]);

  const facturas = data?.data ?? [];
  const metadata = data?.metadata;

  const filterFields: FilterField[] = useMemo(() => {
    const campos: FilterField[] = [
      {
        key: 'search',
        label: 'Buscar',
        type: 'text',
        placeholder: 'Nº de factura o cliente',
      },
      { key: 'estado', label: 'Estado', type: 'select', options: estadoOptions },
    ];

    if (clientes.length > 0) {
      campos.push({
        key: 'clienteId',
        label: 'Cliente',
        type: 'select',
        options: clientes.map((cliente) => ({ value: cliente.id, label: cliente.nombre })),
      });
    }

    campos.push(
      { key: 'fechaDesde', label: 'Emitidas desde', type: 'date' },
      { key: 'fechaHasta', label: 'Emitidas hasta', type: 'date' },
    );

    return campos;
  }, [clientes]);

  const cambiarFiltro = (clave: string, valor: FilterValue) =>
    setFiltros((actual) => ({ ...actual, [clave]: valor }));

  const aplicarFiltros = () => {
    setAplicados({
      search: texto(filtros.search),
      estado: texto(filtros.estado) as InvoiceStatusType | undefined,
      clienteId: entero(filtros.clienteId),
      fechaDesde: texto(filtros.fechaDesde),
      fechaHasta: texto(filtros.fechaHasta),
    });
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setFiltros({});
    setAplicados({});
    setPagina(1);
  };

  /**
   * Enter en un campo de la barra de filtros equivale a pulsar «Buscar». Se
   * limita a los campos (input/select) para no interferir con los botones de la
   * propia barra.
   */
  const buscarConEnter = (evento: KeyboardEvent<HTMLDivElement>) => {
    const etiqueta = (evento.target as HTMLElement)?.tagName;
    if (evento.key !== 'Enter' || (etiqueta !== 'INPUT' && etiqueta !== 'SELECT')) return;

    evento.preventDefault();
    aplicarFiltros();
  };

  // -------------------------------------------------------------------------
  // Acciones
  // -------------------------------------------------------------------------

  const abrirAlta = () => {
    setEditando(null);
    setFormAbierto(true);
  };

  const abrirEdicion = (invoice: Invoice) => {
    setDetalle(null);
    setEditando(invoice);
    setFormAbierto(true);
  };

  const cerrarFormulario = () => {
    setFormAbierto(false);
    setEditando(null);
  };

  const enviarFactura = async (payload: InvoicePayload): Promise<boolean> => {
    setGuardando(true);
    try {
      // Al editar se descartan líneas e IVA: el importe de una factura emitida
      // no se modifica (el backend responde 412 si llegan).
      const cambios: Partial<InvoicePayload> = { ...payload };
      delete cambios.lineas;
      delete cambios.tipoIva;

      const respuesta = editando
        ? await invoiceRequests.update(editando.id, cambios)
        : await invoiceRequests.create(payload);

      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      cerrarFormulario();
      await recargar();
      return true;
    } catch (fallo) {
      toast.error(getErrorMessage(fallo, 'No se ha podido guardar la factura'));
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const enviarDesdeContrato = async (
    payload: InvoiceFromContractPayload,
  ): Promise<boolean> => {
    setEmitiendo(true);
    try {
      const respuesta = await invoiceRequests.createFromContract(payload);

      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      setDesdeContratoAbierto(false);
      await recargar();
      return true;
    } catch (fallo) {
      toast.error(getErrorMessage(fallo, 'No se ha podido emitir la factura del contrato'));
      return false;
    } finally {
      setEmitiendo(false);
    }
  };

  const descargarPdf = async (invoice: Invoice) => {
    setDescargandoId(invoice.id);
    try {
      await invoiceRequests.downloadPdf(invoice.id, invoice.numero);
      toast.success(`Factura ${invoice.numero} descargada`);
    } catch (fallo) {
      toast.error(getErrorMessage(fallo, 'No se ha podido descargar el PDF de la factura'));
    } finally {
      setDescargandoId(null);
    }
  };

  const marcarCobrada = async (invoice: Invoice, fechaCobro: string) => {
    setCobrandoId(invoice.id);
    try {
      const respuesta = await invoiceRequests.markAsPaid(invoice.id, fechaCobro);

      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      setDetalle((actual) => (actual?.id === invoice.id ? respuesta.data : actual));
      setACobrar(null);
      await recargar();
    } catch (fallo) {
      toast.error(getErrorMessage(fallo, 'No se ha podido marcar la factura como cobrada'));
    } finally {
      setCobrandoId(null);
    }
  };

  /** Deshace un cobro apuntado por error: la factura vuelve a Emitida. */
  const confirmarDescobro = async () => {
    if (!aDescobrar) return;

    setProcesando(true);
    try {
      const respuesta = await invoiceRequests.revertPayment(aDescobrar.id);

      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      setDetalle((actual) => (actual?.id === aDescobrar.id ? respuesta.data : actual));
      setADescobrar(null);
      await recargar();
    } catch (fallo) {
      toast.error(getErrorMessage(fallo, 'No se ha podido deshacer el cobro'));
    } finally {
      setProcesando(false);
    }
  };

  const confirmarAnulacion = async () => {
    if (!aAnular) return;

    setProcesando(true);
    try {
      const respuesta = await invoiceRequests.cancel(aAnular.id);

      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      setDetalle((actual) => (actual?.id === aAnular.id ? respuesta.data : actual));
      setAAnular(null);
      await recargar();
    } catch (fallo) {
      toast.error(getErrorMessage(fallo, 'No se ha podido anular la factura'));
    } finally {
      setProcesando(false);
    }
  };

  // -------------------------------------------------------------------------
  // Tabla
  // -------------------------------------------------------------------------

  /**
   * Botonera de una factura. La comparten la tabla de escritorio y la tarjeta
   * de móvil, donde los botones crecen a 44 px para poder pulsarlos con el dedo.
   */
  const acciones = (invoice: Invoice) => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => setDetalle(invoice)}
        aria-label={`Ver la factura ${invoice.numero}`}
        title="Ver detalle"
        className={`${CLASE_ACCION} text-gray-700 hover:text-blue-700 hover:bg-white/50`}
      >
        <FiEye className="w-5 h-5 md:w-4 md:h-4" />
      </button>

      <button
        type="button"
        onClick={() => void descargarPdf(invoice)}
        disabled={descargandoId === invoice.id}
        aria-label={`Descargar el PDF de la factura ${invoice.numero}`}
        title="Descargar PDF"
        className={`${CLASE_ACCION} text-gray-700 hover:text-blue-700 hover:bg-white/50 disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <FiDownload className="w-5 h-5 md:w-4 md:h-4" />
      </button>

      {invoice.estado === InvoiceStatus.COBRADA && (
        <button
          type="button"
          onClick={() => setADescobrar(invoice)}
          aria-label={`Deshacer el cobro de la factura ${invoice.numero}`}
          title="Deshacer cobro"
          className={`${CLASE_ACCION} text-gray-700 hover:text-blue-700 hover:bg-white/50`}
        >
          <FiRotateCcw className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      )}

      {invoice.estado === InvoiceStatus.EMITIDA && (
        <>
          <button
            type="button"
            onClick={() => setACobrar(invoice)}
            disabled={cobrandoId === invoice.id}
            aria-label={`Marcar como cobrada la factura ${invoice.numero}`}
            title="Marcar cobrada"
            className={`${CLASE_ACCION} text-emerald-700 hover:bg-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <FiCheckCircle className="w-5 h-5 md:w-4 md:h-4" />
          </button>

          <button
            type="button"
            onClick={() => abrirEdicion(invoice)}
            aria-label={`Editar la factura ${invoice.numero}`}
            title="Editar"
            className={`${CLASE_ACCION} text-gray-700 hover:text-blue-700 hover:bg-white/50`}
          >
            <FiEdit2 className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </>
      )}

      {invoice.estado !== InvoiceStatus.ANULADA && (
        <button
          type="button"
          onClick={() => setAAnular(invoice)}
          aria-label={`Anular la factura ${invoice.numero}`}
          title="Anular"
          className={`${CLASE_ACCION} text-amber-700 hover:bg-amber-500/15`}
        >
          <FiSlash className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      )}
    </div>
  );

  const columnas: Column<Invoice>[] = [
    {
      key: 'numero',
      header: 'Número',
      render: (invoice) => (
        <span className="font-semibold text-gray-900 whitespace-nowrap">{invoice.numero}</span>
      ),
    },
    {
      key: 'clienteNombre',
      header: 'Cliente',
      render: (invoice) => (
        <div>
          <p className="font-medium text-gray-900">{invoice.clienteNombre}</p>
          {invoice.contratoReferencia && (
            <p className="text-xs text-gray-600">{invoice.contratoReferencia}</p>
          )}
        </div>
      ),
    },
    {
      key: 'fechaEmision',
      header: 'Emisión',
      render: (invoice) => (
        <span className="whitespace-nowrap">{formatDate(invoice.fechaEmision)}</span>
      ),
    },
    {
      key: 'baseImponible',
      header: 'Base',
      className: 'text-right',
      render: (invoice) => (
        <span className="tabular-nums whitespace-nowrap">
          {formatCurrency(invoice.baseImponible)}
        </span>
      ),
    },
    {
      key: 'cuotaIva',
      header: 'IVA',
      className: 'text-right',
      render: (invoice) => (
        <span className="tabular-nums whitespace-nowrap text-gray-700">
          {formatCurrency(invoice.cuotaIva)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      className: 'text-right',
      render: (invoice) => (
        <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap">
          {formatCurrency(invoice.total)}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (invoice) => <InvoiceStatusBadge estado={invoice.estado} />,
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'text-right',
      render: (invoice) => <div className="flex justify-end">{acciones(invoice)}</div>,
    },
  ];

  /** Fila del listado en móvil: la tabla de ocho columnas no cabe en 390 px. */
  const tarjetaMovil = (invoice: Invoice) => (
    <div className="space-y-3">
      <div onClick={() => setDetalle(invoice)} className="cursor-pointer space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 break-words">{invoice.clienteNombre}</p>
          <InvoiceStatusBadge estado={invoice.estado} />
        </div>
        <p className="text-sm text-gray-700">
          {invoice.numero} · {formatDate(invoice.fechaEmision)}
          {invoice.contratoReferencia ? ` · ${invoice.contratoReferencia}` : ''}
        </p>
        <p className="text-base font-bold text-gray-900 tabular-nums">
          {formatCurrency(invoice.total)}
          <span className="ml-2 text-sm font-medium text-gray-600">
            (base {formatCurrency(invoice.baseImponible)} + IVA{' '}
            {formatCurrency(invoice.cuotaIva)})
          </span>
        </p>
      </div>
      {acciones(invoice)}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <header className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 rounded-xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
                <FiDollarSign className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 drop-shadow-sm">
                  Facturas
                </h1>
                <p className="hidden sm:block mt-1 text-gray-700">
                  Honorarios, cobros y seguimiento económico de cada línea de negocio.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => setDesdeContratoAbierto(true)}
                className="px-3 py-2.5 md:px-6 md:py-3"
              >
                <span className="inline-flex items-center gap-2">
                  <FiFilePlus className="w-4 h-4" />
                  Facturar<span className="hidden sm:inline"> contrato</span>
                </span>
              </Button>
              <Button variant="primary" onClick={abrirAlta} className="px-3 py-2.5 md:px-6 md:py-3">
                <span className="inline-flex items-center gap-2">
                  <FiPlus className="w-4 h-4" />
                  Nueva<span className="hidden sm:inline"> factura</span>
                </span>
              </Button>
            </div>
          </div>

          <nav className="mt-4 md:mt-6 flex flex-wrap gap-1 p-1 rounded-xl backdrop-blur-md bg-white/30 border border-white/30">
            <button
              type="button"
              onClick={() => setPestana('listado')}
              className={`inline-flex min-h-11 items-center gap-2 px-3 md:px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer select-none ${
                pestana === 'listado'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'text-gray-800 hover:bg-white/40'
              }`}
            >
              <FiDollarSign className="w-4 h-4" />
              Listado
              {metadata && (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    pestana === 'listado' ? 'bg-white/25' : 'bg-white/50'
                  }`}
                >
                  {metadata.records}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPestana('cliente')}
              className={`inline-flex min-h-11 items-center gap-2 px-3 md:px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer select-none ${
                pestana === 'cliente'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'text-gray-800 hover:bg-white/40'
              }`}
            >
              <FiUsers className="w-4 h-4" />
              Histórico por cliente
            </button>
          </nav>
        </header>

        {pestana === 'listado' ? (
          <>
            {/* Enter en cualquier campo de la barra busca, sin obligar a ir con
                el ratón hasta el botón azul. */}
            <CollapsibleFilters
              activos={
                Object.values(filtros).filter((valor) => valor !== '' && valor !== undefined)
                  .length
              }
            >
              <div onKeyDown={buscarConEnter}>
                <FilterBar
                  fields={filterFields}
                  values={filtros}
                  onChange={cambiarFiltro}
                  onClear={limpiarFiltros}
                  onSearch={aplicarFiltros}
                />
              </div>
            </CollapsibleFilters>

            <InvoiceSummaryCards
              resumen={resumen?.data ?? null}
              loading={loading}
              descripcion="Totales del periodo seleccionado (las facturas anuladas se contabilizan aparte)."
            />

            {!loading && error && (
              <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-red-300/50 shadow-lg p-8 text-center">
                <FiAlertTriangle className="w-10 h-10 mx-auto text-red-600" />
                <p className="mt-3 text-base font-semibold text-red-900">
                  {getErrorMessage(error, 'No se han podido cargar las facturas')}
                </p>
                <Button variant="secondary" className="mt-4" onClick={() => void recargar()}>
                  <span className="inline-flex items-center gap-2">
                    <FiRefreshCw className="w-4 h-4" />
                    Reintentar
                  </span>
                </Button>
              </div>
            )}

            {!error && (
              <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg overflow-hidden">
                <Table
                  data={facturas}
                  columns={columnas}
                  isLoading={loading}
                  renderMobileCard={tarjetaMovil}
                  emptyMessage="No hay facturas con estos criterios. Emite la primera o limpia los filtros."
                />

                {metadata && facturas.length > 0 && (
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
                  />
                )}
              </div>
            )}
          </>
        ) : (
          <ClientInvoiceHistory
            clientes={clientes}
            descargandoId={descargandoId}
            onDetail={setDetalle}
            onDownloadPdf={(invoice) => void descargarPdf(invoice)}
          />
        )}
      </div>

      <InvoiceFormModal
        isOpen={formAbierto}
        invoice={editando}
        clientes={clientes}
        saving={guardando}
        onClose={cerrarFormulario}
        onSubmit={enviarFactura}
      />

      <InvoiceFromContractModal
        isOpen={desdeContratoAbierto}
        contratos={contratos}
        clientes={clientes}
        saving={emitiendo}
        onClose={() => setDesdeContratoAbierto(false)}
        onSubmit={enviarDesdeContrato}
      />

      <InvoiceDetailModal
        invoice={detalle}
        isOpen={Boolean(detalle)}
        descargando={descargandoId === detalle?.id}
        cobrando={cobrandoId === detalle?.id}
        onClose={() => setDetalle(null)}
        onDownloadPdf={(invoice) => void descargarPdf(invoice)}
        onMarkAsPaid={(invoice) => setACobrar(invoice)}
        onRevertPayment={(invoice) => setADescobrar(invoice)}
      />

      <InvoiceMarkPaidModal
        invoice={aCobrar}
        saving={cobrandoId === aCobrar?.id}
        onClose={() => setACobrar(null)}
        onConfirm={(invoice, fechaCobro) => void marcarCobrada(invoice, fechaCobro)}
      />

      <ConfirmDialog
        isOpen={Boolean(aAnular)}
        onClose={() => setAAnular(null)}
        onConfirm={() => void confirmarAnulacion()}
        title="Anular factura"
        message={
          aAnular
            ? `¿Seguro que quieres anular la factura ${aAnular.numero} de ${aAnular.clienteNombre}? Conservará su número, pero dejará de contar en los totales.`
            : ''
        }
        confirmText="Anular"
        variant="warning"
        isLoading={procesando}
      />

      <ConfirmDialog
        isOpen={Boolean(aDescobrar)}
        onClose={() => setADescobrar(null)}
        onConfirm={() => void confirmarDescobro()}
        title="Deshacer el cobro"
        message={
          aDescobrar
            ? `¿Devolvemos la factura ${aDescobrar.numero} a «Emitida»? Se borrará su fecha de cobro y volverá a contar como pendiente.`
            : ''
        }
        confirmText="Deshacer cobro"
        variant="info"
        isLoading={procesando}
      />
    </div>
  );
};
