import { FiCheckCircle, FiDownload, FiRotateCcw } from 'react-icons/fi';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { formatCurrency, formatDate, formatNumber } from '../../helpers/formatters';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { InvoiceStatus } from './invoice.types';
import type { Invoice } from './invoice.types';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  descargando: boolean;
  cobrando: boolean;
  onClose: () => void;
  onDownloadPdf: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
  onRevertPayment: (invoice: Invoice) => void;
}

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div className="flex items-center justify-between gap-4 py-1.5 border-b border-white/30 last:border-b-0">
    <span className="text-sm text-gray-600 select-none">{etiqueta}</span>
    <span className="text-sm font-semibold text-gray-900 text-right">{valor}</span>
  </div>
);

/** Ficha de solo lectura de una factura, con su detalle de líneas y totales. */
export const InvoiceDetailModal = ({
  invoice,
  isOpen,
  descargando,
  cobrando,
  onClose,
  onDownloadPdf,
  onMarkAsPaid,
  onRevertPayment,
}: InvoiceDetailModalProps) => {
  if (!invoice) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Factura ${invoice.numero}`} size="xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <InvoiceStatusBadge estado={invoice.estado} />
          <div className="flex flex-wrap gap-2">
            {invoice.estado === InvoiceStatus.EMITIDA && (
              <Button
                variant="ghost"
                className="px-4 py-2"
                onClick={() => onMarkAsPaid(invoice)}
                isLoading={cobrando}
              >
                <span className="inline-flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4" />
                  Marcar cobrada
                </span>
              </Button>
            )}

            {invoice.estado === InvoiceStatus.COBRADA && (
              <Button
                variant="ghost"
                className="px-4 py-2"
                onClick={() => onRevertPayment(invoice)}
              >
                <span className="inline-flex items-center gap-2">
                  <FiRotateCcw className="w-4 h-4" />
                  Deshacer cobro
                </span>
              </Button>
            )}
            <Button
              variant="primary"
              className="px-4 py-2"
              onClick={() => onDownloadPdf(invoice)}
              isLoading={descargando}
            >
              <span className="inline-flex items-center gap-2">
                <FiDownload className="w-4 h-4" />
                Descargar PDF
              </span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="backdrop-blur-md bg-white/40 rounded-xl border border-white/30 p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 select-none">
              Facturar a
            </h3>
            <p className="text-base font-bold text-gray-900">{invoice.clienteNombre}</p>
            <div className="mt-1 text-sm text-gray-700 space-y-0.5">
              {invoice.clienteDocumento && <p>NIF/CIF {invoice.clienteDocumento}</p>}
              {invoice.clienteDireccion && <p>{invoice.clienteDireccion}</p>}
              {invoice.clienteEmail && <p>{invoice.clienteEmail}</p>}
            </div>
          </section>

          <section className="backdrop-blur-md bg-white/40 rounded-xl border border-white/30 p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 select-none">
              Datos de la factura
            </h3>
            <Dato etiqueta="Número" valor={invoice.numero} />
            <Dato etiqueta="Fecha de emisión" valor={formatDate(invoice.fechaEmision)} />
            <Dato etiqueta="Ejercicio" valor={String(invoice.ejercicio)} />
            {invoice.contratoReferencia && (
              <Dato etiqueta="Contrato" valor={invoice.contratoReferencia} />
            )}
            {invoice.fechaCobro && (
              <Dato etiqueta="Fecha de cobro" valor={formatDate(invoice.fechaCobro)} />
            )}
          </section>
        </div>

        <section className="rounded-xl border border-white/30 backdrop-blur-md bg-white/25 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/40 border-b border-white/30">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider select-none">
                    Concepto
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider select-none whitespace-nowrap">
                    Cantidad
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider select-none whitespace-nowrap">
                    Precio unit.
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider select-none whitespace-nowrap">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/30">
                {invoice.lineas.map((linea, indice) => (
                  <tr key={indice}>
                    <td className="px-4 py-2.5 text-sm text-gray-900">{linea.concepto}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                      {formatNumber(linea.cantidad)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(linea.precioUnitario)}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-bold text-gray-900 text-right tabular-nums whitespace-nowrap">
                      {formatCurrency(linea.importe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="backdrop-blur-md bg-white/40 rounded-xl border border-white/30 p-4">
          <dl className="space-y-2 max-w-sm ml-auto">
            <div className="flex items-center justify-between gap-6 text-sm">
              <dt className="text-gray-700">Base imponible</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">
                {formatCurrency(invoice.baseImponible)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 text-sm">
              <dt className="text-gray-700">IVA ({formatNumber(invoice.tipoIva)} %)</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">
                {formatCurrency(invoice.cuotaIva)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 pt-2 border-t border-white/40">
              <dt className="text-base font-bold text-gray-900">Total factura</dt>
              <dd className="text-xl font-bold text-blue-700 tabular-nums drop-shadow-sm">
                {formatCurrency(invoice.total)}
              </dd>
            </div>
          </dl>
        </div>

        {invoice.notas && (
          <section className="rounded-xl border-l-4 border-blue-600 backdrop-blur-md bg-white/40 p-4">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 select-none">
              Observaciones
            </h3>
            <p className="text-sm text-gray-800 whitespace-pre-line">{invoice.notas}</p>
          </section>
        )}
      </div>
    </Modal>
  );
};
