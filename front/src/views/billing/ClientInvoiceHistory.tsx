import { useRef, useState } from 'react';
import { FiAlertTriangle, FiDownload, FiEye, FiUser } from 'react-icons/fi';
import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { getErrorMessage } from '../../helpers/errorHandler';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoiceSummaryCards } from './InvoiceSummaryCards';
import { invoiceRequests } from './invoices.requests';
import type { ClientInvoiceHistory as Historial, ClientOption, Invoice } from './invoice.types';

interface ClientInvoiceHistoryProps {
  clientes: ClientOption[];
  descargandoId: number | null;
  onDetail: (invoice: Invoice) => void;
  onDownloadPdf: (invoice: Invoice) => void;
}

const controlClasses =
  'w-full px-4 py-3 backdrop-blur-md bg-white/50 border border-gray-300 rounded-xl text-gray-900 text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm';

/**
 * Histórico de facturación de un cliente concreto: sus totales acumulados y
 * todas sus facturas, sin paginar (el backend devuelve el histórico completo).
 */
export const ClientInvoiceHistory = ({
  clientes,
  descargandoId,
  onDetail,
  onDownloadPdf,
}: ClientInvoiceHistoryProps) => {
  /** Cliente cuyo histórico se está mostrando. */
  const [clienteId, setClienteId] = useState('');
  /** Texto del campo manual, que sólo se consulta al confirmarlo. */
  const [entradaManual, setEntradaManual] = useState('');
  const [historial, setHistorial] = useState<Historial | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<unknown>(null);

  /**
   * Contador de la última petición lanzada. Si la persona usuaria cambia de cliente
   * mientras una consulta sigue en vuelo, la respuesta atrasada se descarta y
   * nunca sobrescribe al histórico del cliente que hay en pantalla.
   */
  const peticionRef = useRef(0);

  /**
   * La carga se dispara desde el propio evento de selección, no desde un
   * efecto: pedir el histórico es la respuesta a una acción de la persona usuaria, no
   * una sincronización con estado externo.
   */
  const cambiarCliente = async (valor: string) => {
    // Salir del campo manual sin haberlo cambiado no repite la consulta; si la
    // anterior falló sí se reintenta.
    if (valor === clienteId && historial) return;

    const peticion = ++peticionRef.current;

    setClienteId(valor);
    setHistorial(null);
    setError(null);

    if (!valor) {
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      const respuesta = await invoiceRequests.findByClient(Number(valor));
      if (peticionRef.current === peticion) setHistorial(respuesta.data);
    } catch (fallo) {
      if (peticionRef.current === peticion) setError(fallo);
    } finally {
      if (peticionRef.current === peticion) setCargando(false);
    }
  };

  const nombreElegido =
    clientes.find((cliente) => String(cliente.id) === clienteId)?.nombre ??
    historial?.clienteNombre ??
    '';

  /** Botonera de una factura, compartida por la tabla y la tarjeta de móvil. */
  const acciones = (invoice: Invoice) => (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onDetail(invoice)}
        aria-label={`Ver la factura ${invoice.numero}`}
        title="Ver detalle"
        className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center rounded-lg text-gray-700 hover:text-blue-700 hover:bg-white/50 transition-colors cursor-pointer"
      >
        <FiEye className="w-5 h-5 md:w-4 md:h-4" />
      </button>
      <button
        type="button"
        onClick={() => onDownloadPdf(invoice)}
        disabled={descargandoId === invoice.id}
        aria-label={`Descargar el PDF de la factura ${invoice.numero}`}
        title="Descargar PDF"
        className="inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center rounded-lg text-gray-700 hover:text-blue-700 hover:bg-white/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiDownload className="w-5 h-5 md:w-4 md:h-4" />
      </button>
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
      key: 'fechaEmision',
      header: 'Emisión',
      render: (invoice) => (
        <span className="whitespace-nowrap">{formatDate(invoice.fechaEmision)}</span>
      ),
    },
    {
      key: 'concepto',
      header: 'Concepto',
      render: (invoice) => (
        <span className="text-gray-700">{invoice.lineas?.[0]?.concepto ?? '—'}</span>
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

  /** Fila del histórico en móvil: la tabla de seis columnas no cabe en 390 px. */
  const tarjetaMovil = (invoice: Invoice) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-gray-900">{invoice.numero}</p>
        <InvoiceStatusBadge estado={invoice.estado} />
      </div>
      <p className="text-sm text-gray-700 break-words">
        {invoice.lineas?.[0]?.concepto ?? 'Sin concepto'}
      </p>
      <p className="text-sm text-gray-600">
        {formatDate(invoice.fechaEmision)} ·{' '}
        <span className="font-bold text-gray-900 tabular-nums">
          {formatCurrency(invoice.total)}
        </span>
      </p>
      {acciones(invoice)}
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-4">
        <label className="block text-base font-semibold text-gray-900 mb-2" htmlFor="historico-cliente">
          Cliente
        </label>
        {clientes.length > 0 ? (
          <select
            id="historico-cliente"
            value={clienteId}
            onChange={(evento) => void cambiarCliente(evento.target.value)}
            className={`${controlClasses} cursor-pointer max-w-xl`}
          >
            <option value="">Selecciona un cliente para ver su histórico…</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
                {cliente.documento ? ` — ${cliente.documento}` : ''}
              </option>
            ))}
          </select>
        ) : (
          // Sin lista de clientes se escribe el identificador a mano. La
          // consulta se lanza al confirmar (Intro o salir del campo) y no en
          // cada tecla, para no disparar una petición por dígito escrito.
          <input
            id="historico-cliente"
            type="number"
            min={1}
            value={entradaManual}
            onChange={(evento) => setEntradaManual(evento.target.value)}
            onBlur={() => void cambiarCliente(entradaManual)}
            onKeyDown={(evento) => {
              if (evento.key !== 'Enter') return;
              evento.preventDefault();
              void cambiarCliente(entradaManual);
            }}
            placeholder="ID del cliente e Intro"
            className={`${controlClasses} max-w-xs`}
          />
        )}
      </section>

      {!clienteId && (
        <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg p-12 text-center">
          <FiUser className="w-12 h-12 mx-auto text-blue-600/50" />
          <p className="mt-4 text-lg font-semibold text-gray-900">
            Elige un cliente para ver su facturación
          </p>
          <p className="mt-1 text-gray-700">
            Verás sus totales acumulados y todas las facturas emitidas a su nombre.
          </p>
        </div>
      )}

      {clienteId && cargando && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      )}

      {clienteId && !cargando && Boolean(error) && (
        <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-red-300/50 shadow-lg p-8 text-center">
          <FiAlertTriangle className="w-10 h-10 mx-auto text-red-600" />
          <p className="mt-3 text-base font-semibold text-red-900">
            {getErrorMessage(error, 'No se ha podido cargar el histórico del cliente')}
          </p>
        </div>
      )}

      {clienteId && !cargando && !error && historial && (
        <>
          <InvoiceSummaryCards
            resumen={historial.resumen}
            descripcion={`Facturación acumulada de ${nombreElegido || `el cliente #${historial.clienteId}`}`}
          />

          <div className="backdrop-blur-xl bg-white/20 rounded-xl border border-white/30 shadow-lg overflow-hidden">
            <Table
              data={historial.facturas}
              columns={columnas}
              renderMobileCard={tarjetaMovil}
              emptyMessage="Este cliente todavía no tiene facturas emitidas"
            />
          </div>
        </>
      )}
    </div>
  );
};
