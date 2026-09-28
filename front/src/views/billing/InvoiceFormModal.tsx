import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FiAlertCircle, FiSave } from 'react-icons/fi';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { InvoiceLinesEditor } from './InvoiceLinesEditor';
import { InvoiceTotalsPreview } from './InvoiceTotalsPreview';
import {
  aNumero,
  calcularTotales,
  formatearCantidad,
  formatearImporte,
  hoyIso,
  lineaVacia,
} from './invoice.helpers';
import type {
  ClientOption,
  Invoice,
  InvoiceLineDraft,
  InvoicePayload,
} from './invoice.types';

interface InvoiceFormModalProps {
  isOpen: boolean;
  /** Factura a editar; `null` para emitir una nueva. */
  invoice: Invoice | null;
  clientes: ClientOption[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: InvoicePayload) => Promise<boolean>;
}

interface InvoiceFormProps extends Omit<InvoiceFormModalProps, 'isOpen'> {
  /** Avisa al modal de si hay cambios sin guardar, para no cerrarlo en falso. */
  onDirtyChange: (sucio: boolean) => void;
}

interface EstadoFormulario {
  clienteId: string;
  clienteNombre: string;
  clienteDocumento: string;
  clienteDireccion: string;
  clienteEmail: string;
  contratoReferencia: string;
  tipoIva: string;
  fechaEmision: string;
  notas: string;
}

const controlClasses =
  'w-full px-4 py-3 backdrop-blur-md bg-white/50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm';

const labelClasses = 'block text-base font-semibold text-gray-900 mb-2';

const estadoInicial = (invoice: Invoice | null): EstadoFormulario => ({
  clienteId: invoice ? String(invoice.clienteId) : '',
  clienteNombre: invoice?.clienteNombre ?? '',
  clienteDocumento: invoice?.clienteDocumento ?? '',
  clienteDireccion: invoice?.clienteDireccion ?? '',
  clienteEmail: invoice?.clienteEmail ?? '',
  contratoReferencia: invoice?.contratoReferencia ?? '',
  tipoIva: invoice ? formatearCantidad(String(invoice.tipoIva)) : '21',
  fechaEmision: invoice?.fechaEmision?.slice(0, 10) ?? hoyIso(),
  notas: invoice?.notas ?? '',
});

const lineasIniciales = (invoice: Invoice | null): InvoiceLineDraft[] => {
  if (!invoice || !invoice.lineas?.length) return [lineaVacia()];

  // Se muestran en es-ES, que es como se van a volver a leer del formulario.
  return invoice.lineas.map((linea) => ({
    concepto: linea.concepto,
    cantidad: formatearCantidad(String(linea.cantidad)),
    precioUnitario: formatearImporte(String(linea.precioUnitario)),
  }));
};

/**
 * Formulario de emisión y edición de facturas.
 *
 * Los datos fiscales del cliente quedan como campos editables aunque se elija
 * un cliente del desplegable: la factura guarda una copia de esos datos y debe
 * poder ajustarse al emitir sin tocar la ficha del cliente.
 *
 * Al EDITAR una factura ya emitida los importes están bloqueados (líneas e IVA):
 * el número correlativo ya está asignado y el documento puede estar en manos del
 * cliente, así que cambiar la cifra dejaría dos facturas distintas con el mismo
 * número. El backend lo rechaza igualmente.
 */
const InvoiceForm = ({
  invoice,
  clientes,
  saving,
  onClose,
  onSubmit,
  onDirtyChange,
}: InvoiceFormProps) => {
  const [form, setForm] = useState<EstadoFormulario>(() => estadoInicial(invoice));
  const [lineas, setLineas] = useState<InvoiceLineDraft[]>(() => lineasIniciales(invoice));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [erroresLinea, setErroresLinea] = useState<Record<number, string>>({});

  const importesBloqueados = Boolean(invoice);

  const totales = useMemo(() => calcularTotales(lineas, form.tipoIva), [lineas, form.tipoIva]);

  // Huella del estado inicial para saber si hay cambios sin guardar.
  const huellaInicial = useMemo(
    () => JSON.stringify({ form: estadoInicial(invoice), lineas: lineasIniciales(invoice) }),
    [invoice],
  );
  const sucio = JSON.stringify({ form, lineas }) !== huellaInicial;

  useEffect(() => onDirtyChange(sucio), [sucio, onDirtyChange]);

  const setCampo = <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) =>
    setForm((actual) => ({ ...actual, [campo]: valor }));

  /** Al elegir cliente del desplegable se precargan sus datos fiscales. */
  const elegirCliente = (valor: string) => {
    const seleccionado = clientes.find((cliente) => String(cliente.id) === valor);

    setForm((actual) => ({
      ...actual,
      clienteId: valor,
      clienteNombre: seleccionado?.nombre ?? actual.clienteNombre,
      clienteDocumento: seleccionado?.documento ?? actual.clienteDocumento,
      clienteEmail: seleccionado?.email ?? actual.clienteEmail,
      clienteDireccion: seleccionado?.direccion ?? actual.clienteDireccion,
    }));
  };

  const validar = (): { campos: Record<string, string>; porLinea: Record<number, string> } => {
    const campos: Record<string, string> = {};
    const porLinea: Record<number, string> = {};

    const clienteId = Number(form.clienteId);
    if (!form.clienteId.trim() || !Number.isInteger(clienteId) || clienteId <= 0) {
      campos.clienteId = 'Selecciona el cliente al que se factura';
    }
    if (!form.clienteNombre.trim()) {
      campos.clienteNombre = 'El nombre fiscal del cliente es obligatorio';
    }

    const tipoIva = aNumero(form.tipoIva);
    if (!form.tipoIva.trim()) campos.tipoIva = 'Indica el tipo de IVA (0 si está exenta)';
    else if (tipoIva < 0 || tipoIva > 100) campos.tipoIva = 'El IVA debe estar entre 0 y 100';

    if (!form.fechaEmision) campos.fechaEmision = 'La fecha de emisión es obligatoria';

    lineas.forEach((linea, indice) => {
      if (!linea.concepto.trim()) {
        porLinea[indice] = 'El concepto de la línea es obligatorio';
        return;
      }
      if (aNumero(linea.cantidad) < 0 || aNumero(linea.precioUnitario) < 0) {
        porLinea[indice] = 'La cantidad y el precio no pueden ser negativos';
      }
    });

    if (totales.baseImponible <= 0) {
      campos.lineas = 'La factura no puede tener un importe de 0 €';
    }

    return { campos, porLinea };
  };

  const handleSubmit = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    const { campos, porLinea } = validar();
    setErrores(campos);
    setErroresLinea(porLinea);
    if (Object.keys(campos).length > 0 || Object.keys(porLinea).length > 0) return;

    // Las líneas y el IVA viajan siempre, pero al editar una factura emitida la
    // vista los descarta antes del PATCH: su importe ya no se toca.
    const payload: InvoicePayload = {
      clienteId: Number(form.clienteId),
      clienteNombre: form.clienteNombre.trim(),
      lineas: lineas.map((linea) => ({
        concepto: linea.concepto.trim(),
        cantidad: aNumero(linea.cantidad),
        precioUnitario: aNumero(linea.precioUnitario),
      })),
      tipoIva: aNumero(form.tipoIva),
      fechaEmision: form.fechaEmision,
    };

    if (form.clienteDocumento.trim()) payload.clienteDocumento = form.clienteDocumento.trim();
    if (form.clienteDireccion.trim()) payload.clienteDireccion = form.clienteDireccion.trim();
    if (form.clienteEmail.trim()) payload.clienteEmail = form.clienteEmail.trim();
    if (form.contratoReferencia.trim())
      payload.contratoReferencia = form.contratoReferencia.trim();
    if (form.notas.trim()) payload.notas = form.notas.trim();
    if (invoice?.contratoId) payload.contratoId = invoice.contratoId;

    await onSubmit(payload);
  };

  const hayErrores = Object.keys(errores).length > 0 || Object.keys(erroresLinea).length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          {clientes.length > 0 ? (
            <>
              <label className={labelClasses} htmlFor="invoice-cliente">
                Cliente *
              </label>
              <select
                id="invoice-cliente"
                value={form.clienteId}
                onChange={(evento) => elegirCliente(evento.target.value)}
                className={`${controlClasses} cursor-pointer`}
              >
                <option value="">Selecciona un cliente…</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                    {cliente.documento ? ` — ${cliente.documento}` : ''}
                  </option>
                ))}
              </select>
              {errores.clienteId && (
                <p className="mt-2 text-sm font-medium text-red-700">{errores.clienteId}</p>
              )}
            </>
          ) : (
            <Input
              label="ID de cliente *"
              type="number"
              min={1}
              value={form.clienteId}
              onChange={(evento) => setCampo('clienteId', evento.target.value)}
              placeholder="12"
              error={errores.clienteId}
            />
          )}
        </div>

        <div className="sm:col-span-2">
          <Input
            label="Nombre o razón social *"
            value={form.clienteNombre}
            onChange={(evento) => setCampo('clienteNombre', evento.target.value)}
            placeholder="Promociones Orión, S.L."
            error={errores.clienteNombre}
          />
        </div>

        <Input
          label="NIF / CIF"
          value={form.clienteDocumento}
          onChange={(evento) => setCampo('clienteDocumento', evento.target.value)}
          placeholder="B12345678"
        />

        <Input
          label="Correo de facturación"
          value={form.clienteEmail}
          onChange={(evento) => setCampo('clienteEmail', evento.target.value)}
          placeholder="administracion@example.com"
        />

        <div className="sm:col-span-2">
          <Input
            label="Dirección fiscal"
            value={form.clienteDireccion}
            onChange={(evento) => setCampo('clienteDireccion', evento.target.value)}
            placeholder="Avenida del Puerto 45, 00110 Altabria"
          />
        </div>
      </div>

      <InvoiceLinesEditor
        lineas={lineas}
        onChange={setLineas}
        errores={erroresLinea}
        disabled={saving}
        bloqueado={importesBloqueados}
      />

      {errores.lineas && (
        <p className="text-sm font-medium text-red-700">{errores.lineas}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="Tipo de IVA (%) *"
          type="text"
          inputMode="decimal"
          value={form.tipoIva}
          onChange={(evento) => setCampo('tipoIva', evento.target.value)}
          onBlur={(evento) => setCampo('tipoIva', formatearCantidad(evento.target.value))}
          placeholder="21"
          disabled={importesBloqueados}
          error={errores.tipoIva}
        />

        <Input
          label="Fecha de emisión *"
          type="date"
          value={form.fechaEmision}
          onChange={(evento) => setCampo('fechaEmision', evento.target.value)}
          error={errores.fechaEmision}
        />

        <Input
          label="Referencia de contrato"
          value={form.contratoReferencia}
          onChange={(evento) => setCampo('contratoReferencia', evento.target.value)}
          placeholder="CTR-2026-0007"
        />
      </div>

      <InvoiceTotalsPreview
        baseImponible={totales.baseImponible}
        cuotaIva={totales.cuotaIva}
        total={totales.total}
        tipoIva={form.tipoIva}
      />

      <div>
        <label className={labelClasses} htmlFor="invoice-notas">
          Observaciones
        </label>
        <textarea
          id="invoice-notas"
          rows={2}
          value={form.notas}
          onChange={(evento) => setCampo('notas', evento.target.value)}
          placeholder="Pago a 30 días por transferencia."
          className={`${controlClasses} resize-y`}
        />
      </div>

      {hayErrores && (
        <p className="flex items-center gap-2 text-sm font-medium text-red-700">
          <FiAlertCircle className="w-4 h-4" />
          Revisa los campos marcados antes de emitir la factura.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          <span className="inline-flex items-center gap-2">
            <FiSave className="w-4 h-4" />
            {invoice ? 'Guardar cambios' : 'Emitir factura'}
          </span>
        </Button>
      </div>
    </form>
  );
};

/**
 * Modal de emisión y edición de facturas. El número correlativo lo asigna el
 * backend al emitir, así que aquí nunca se muestra ni se edita en el alta.
 *
 * Con cambios sin guardar, cerrar (aspa, Escape o clic en el fondo) pide
 * confirmación: media pantalla de factura escrita no puede evaporarse por un
 * clic fuera del recuadro.
 */
export const InvoiceFormModal = ({
  isOpen,
  invoice,
  clientes,
  saving,
  onClose,
  onSubmit,
}: InvoiceFormModalProps) => {
  const [sucio, setSucio] = useState(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  const intentarCerrar = () => {
    if (sucio) {
      setConfirmandoDescarte(true);
      return;
    }
    onClose();
  };

  const descartar = () => {
    setConfirmandoDescarte(false);
    setSucio(false);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={intentarCerrar}
        title={invoice ? `Editar factura ${invoice.numero}` : 'Nueva factura'}
        size="xl"
      >
        <InvoiceForm
          key={invoice?.id ?? 'nueva'}
          invoice={invoice}
          clientes={clientes}
          saving={saving}
          onClose={intentarCerrar}
          onSubmit={onSubmit}
          onDirtyChange={setSucio}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmandoDescarte}
        onClose={() => setConfirmandoDescarte(false)}
        onConfirm={descartar}
        title="Descartar los cambios"
        message={
          invoice
            ? `Has modificado la factura ${invoice.numero} y no lo has guardado. ¿Descartas los cambios?`
            : 'Has empezado a escribir esta factura y no la has emitido. ¿Descartas lo escrito?'
        }
        confirmText="Descartar"
        cancelText="Seguir editando"
        variant="warning"
      />
    </>
  );
};
