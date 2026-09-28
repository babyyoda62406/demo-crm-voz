import { FiLock, FiPlus, FiTrash2 } from 'react-icons/fi';
import { formatCurrency } from '../../helpers/formatters';
import { formatearCantidad, formatearImporte, importeLinea, lineaVacia } from './invoice.helpers';
import type { InvoiceLineDraft } from './invoice.types';

interface InvoiceLinesEditorProps {
  lineas: InvoiceLineDraft[];
  onChange: (lineas: InvoiceLineDraft[]) => void;
  /** Mensajes de error por índice de línea. */
  errores?: Record<number, string>;
  disabled?: boolean;
  /** Factura ya emitida: sus importes no se tocan, sólo se consultan. */
  bloqueado?: boolean;
}

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm';

/**
 * Editor de líneas de factura. Cada fila calcula su importe en vivo
 * (`cantidad × precio unitario`) con el mismo redondeo que aplica el backend,
 * de modo que lo que se ve en pantalla es exactamente lo que se guardará.
 *
 * Cantidad y precio son campos de texto, no `type="number"`: el navegador
 * descartaba la coma decimal y «1234,56» acababa siendo 123.456. Se normalizan
 * con `aNumero` y se reescriben en formato español al salir del campo.
 */
export const InvoiceLinesEditor = ({
  lineas,
  onChange,
  errores = {},
  disabled = false,
  bloqueado = false,
}: InvoiceLinesEditorProps) => {
  const inutilizado = disabled || bloqueado;

  const actualizar = <K extends keyof InvoiceLineDraft>(
    indice: number,
    campo: K,
    valor: InvoiceLineDraft[K],
  ) =>
    onChange(
      lineas.map((linea, posicion) =>
        posicion === indice ? { ...linea, [campo]: valor } : linea,
      ),
    );

  const anadir = () => onChange([...lineas, lineaVacia()]);

  const eliminar = (indice: number) =>
    onChange(lineas.filter((_, posicion) => posicion !== indice));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-base font-semibold text-gray-900 select-none">
          Líneas de la factura *
        </label>
        {!bloqueado && (
          <button
            type="button"
            onClick={anadir}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-md bg-white/40 text-blue-700 border border-white/30 hover:bg-white/60 transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiPlus className="w-4 h-4" />
            Añadir línea
          </button>
        )}
      </div>

      {bloqueado && (
        <p className="flex items-start gap-2 text-sm text-gray-800 p-3 rounded-xl backdrop-blur-md bg-amber-500/10 border border-amber-500/25">
          <FiLock className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-700" />
          El importe de una factura ya emitida no se modifica. Si hay que cambiarlo, anula
          esta factura y emite una nueva.
        </p>
      )}

      <div className="rounded-xl border border-white/30 backdrop-blur-md bg-white/25 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 bg-white/30 border-b border-white/30 text-xs font-semibold text-gray-800 uppercase tracking-wider select-none">
          <span className="col-span-6">Concepto</span>
          <span className="col-span-2 text-right">Cantidad</span>
          <span className="col-span-2 text-right">Precio unit.</span>
          <span className="col-span-2 text-right">Importe</span>
        </div>

        <div className="divide-y divide-white/30">
          {lineas.map((linea, indice) => (
            <div key={indice} className="p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={linea.concepto}
                    onChange={(evento) => actualizar(indice, 'concepto', evento.target.value)}
                    placeholder="Honorarios de búsqueda de inversión (PSI)"
                    disabled={inutilizado}
                    className={controlClasses}
                    aria-label={`Concepto de la línea ${indice + 1}`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={linea.cantidad}
                    onChange={(evento) => actualizar(indice, 'cantidad', evento.target.value)}
                    onBlur={(evento) =>
                      actualizar(indice, 'cantidad', formatearCantidad(evento.target.value))
                    }
                    placeholder="1"
                    disabled={inutilizado}
                    className={`${controlClasses} text-right`}
                    aria-label={`Cantidad de la línea ${indice + 1}`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={linea.precioUnitario}
                    onChange={(evento) =>
                      actualizar(indice, 'precioUnitario', evento.target.value)
                    }
                    onBlur={(evento) =>
                      actualizar(indice, 'precioUnitario', formatearImporte(evento.target.value))
                    }
                    placeholder="3.500,00"
                    disabled={inutilizado}
                    className={`${controlClasses} text-right`}
                    aria-label={`Precio unitario de la línea ${indice + 1}`}
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-2">
                  <span className="text-sm font-bold text-gray-900 tabular-nums">
                    {formatCurrency(importeLinea(linea))}
                  </span>
                  {!bloqueado && (
                    <button
                      type="button"
                      onClick={() => eliminar(indice)}
                      disabled={disabled || lineas.length <= 1}
                      aria-label={`Eliminar la línea ${indice + 1}`}
                      title={
                        lineas.length <= 1
                          ? 'La factura debe tener al menos una línea'
                          : 'Eliminar línea'
                      }
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/15 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {errores[indice] && (
                <p className="text-sm font-medium text-red-700">{errores[indice]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
