import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FiAlertCircle, FiFilePlus, FiInfo, FiUserPlus } from 'react-icons/fi';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { InvoiceTotalsPreview } from './InvoiceTotalsPreview';
import {
  aNumero,
  calcularTotales,
  formatearCantidad,
  formatearImporte,
  hoyIso,
} from './invoice.helpers';
import type {
  ClientOption,
  ContractOption,
  InvoiceFromContractPayload,
} from './invoice.types';

interface InvoiceFromContractModalProps {
  isOpen: boolean;
  contratos: ContractOption[];
  clientes: ClientOption[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: InvoiceFromContractPayload) => Promise<boolean>;
}

interface FromContractFormProps extends Omit<InvoiceFromContractModalProps, 'isOpen'> {
  /** Avisa al modal de si hay cambios sin guardar, para no cerrarlo en falso. */
  onDirtyChange: (sucio: boolean) => void;
}

interface EstadoFormulario {
  contratoId: string;
  clienteId: string;
  concepto: string;
  importe: string;
  cantidad: string;
  tipoIva: string;
  fechaEmision: string;
  notas: string;
}

const controlClasses =
  'w-full px-4 py-3 backdrop-blur-md bg-white/50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm';

const labelClasses = 'block text-base font-semibold text-gray-900 mb-2';

const ESTADO_INICIAL: EstadoFormulario = {
  contratoId: '',
  clienteId: '',
  concepto: '',
  importe: '',
  cantidad: '1',
  tipoIva: '21',
  fechaEmision: hoyIso(),
  notas: '',
};

/** Huella del formulario en blanco, para detectar cambios sin guardar. */
const HUELLA_INICIAL = JSON.stringify(ESTADO_INICIAL);

/**
 * Emisión de factura a partir de un contrato.
 *
 * El cliente sale del propio contrato (`clienteId` / `clienteNombre`) y el
 * backend completa sus datos fiscales desde la ficha. Cuando el contrato elegido
 * NO tiene cliente vinculado aparece aquí mismo un desplegable para elegirlo: el
 * mensaje de error decía «indícalos manualmente» sin ofrecer dónde hacerlo.
 */
const FromContractForm = ({
  contratos,
  clientes,
  saving,
  onClose,
  onSubmit,
  onDirtyChange,
}: FromContractFormProps) => {
  const [form, setForm] = useState<EstadoFormulario>(ESTADO_INICIAL);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const contratoElegido = useMemo(
    () => contratos.find((contrato) => String(contrato.id) === form.contratoId) ?? null,
    [contratos, form.contratoId],
  );

  const clienteElegido = useMemo(
    () => clientes.find((cliente) => String(cliente.id) === form.clienteId) ?? null,
    [clientes, form.clienteId],
  );

  /** El contrato elegido no trae cliente: hay que elegirlo en este formulario. */
  const necesitaCliente = Boolean(form.contratoId.trim()) && !contratoElegido?.clienteId;

  const totales = useMemo(
    () =>
      calcularTotales(
        [{ concepto: form.concepto, cantidad: form.cantidad, precioUnitario: form.importe }],
        form.tipoIva,
      ),
    [form.concepto, form.cantidad, form.importe, form.tipoIva],
  );

  const sucio = JSON.stringify(form) !== HUELLA_INICIAL;

  useEffect(() => onDirtyChange(sucio), [sucio, onDirtyChange]);

  const setCampo = <K extends keyof EstadoFormulario>(campo: K, valor: EstadoFormulario[K]) =>
    setForm((actual) => ({ ...actual, [campo]: valor }));

  /** Al elegir contrato se propone su título como concepto de la factura. */
  const elegirContrato = (valor: string) => {
    const seleccionado = contratos.find((contrato) => String(contrato.id) === valor);

    setForm((actual) => ({
      ...actual,
      contratoId: valor,
      concepto: seleccionado?.titulo?.trim() ? seleccionado.titulo.trim() : actual.concepto,
      // El cliente del contrato manda: el elegido a mano sólo sirve si no hay.
      clienteId: seleccionado?.clienteId ? '' : actual.clienteId,
    }));
  };

  const validar = (): Record<string, string> => {
    const nuevos: Record<string, string> = {};

    const contratoId = Number(form.contratoId);
    if (!form.contratoId.trim() || !Number.isInteger(contratoId) || contratoId <= 0) {
      nuevos.contratoId = 'Selecciona el contrato que se va a facturar';
    }

    if (necesitaCliente && clientes.length > 0 && !form.clienteId.trim()) {
      nuevos.clienteId = 'Este contrato no tiene cliente: elige a quién se factura';
    }

    const tipoIva = aNumero(form.tipoIva);
    if (tipoIva < 0 || tipoIva > 100) nuevos.tipoIva = 'El IVA debe estar entre 0 y 100';

    if (form.importe.trim() && aNumero(form.importe) < 0) {
      nuevos.importe = 'El importe no puede ser negativo';
    }

    if (!form.fechaEmision) nuevos.fechaEmision = 'La fecha de emisión es obligatoria';

    return nuevos;
  };

  const handleSubmit = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    const nuevosErrores = validar();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const payload: InvoiceFromContractPayload = {
      contratoId: Number(form.contratoId),
      tipoIva: aNumero(form.tipoIva),
      fechaEmision: form.fechaEmision,
    };

    if (form.concepto.trim()) payload.concepto = form.concepto.trim();
    if (form.importe.trim()) payload.importe = aNumero(form.importe);
    if (form.cantidad.trim()) payload.cantidad = aNumero(form.cantidad);
    if (form.notas.trim()) payload.notas = form.notas.trim();

    if (contratoElegido) {
      payload.contratoReferencia = contratoElegido.referencia;
      if (contratoElegido.clienteId) payload.clienteId = contratoElegido.clienteId;
      if (contratoElegido.clienteNombre) payload.clienteNombre = contratoElegido.clienteNombre;
    }

    // Cliente elegido a mano para un contrato que no lo tenía.
    if (!payload.clienteId && clienteElegido) {
      payload.clienteId = clienteElegido.id;
      payload.clienteNombre = clienteElegido.nombre;
      if (clienteElegido.documento) payload.clienteDocumento = clienteElegido.documento;
      if (clienteElegido.email) payload.clienteEmail = clienteElegido.email;
      if (clienteElegido.direccion) payload.clienteDireccion = clienteElegido.direccion;
    }

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3 p-3 rounded-xl backdrop-blur-md bg-blue-500/10 border border-blue-500/25">
        <FiInfo className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-800">
          Los datos fiscales del cliente se toman de su ficha. Deja el importe en blanco para
          usar el que figura en el contrato (honorarios, reserva o renta mensual), o escríbelo
          aquí para ajustarlo antes de emitir.
        </p>
      </div>

      <div>
        {contratos.length > 0 ? (
          <>
            <label className={labelClasses} htmlFor="invoice-contrato">
              Contrato *
            </label>
            <select
              id="invoice-contrato"
              value={form.contratoId}
              onChange={(evento) => elegirContrato(evento.target.value)}
              className={`${controlClasses} cursor-pointer`}
            >
              <option value="">Selecciona un contrato…</option>
              {contratos.map((contrato) => (
                <option key={contrato.id} value={contrato.id}>
                  {contrato.referencia}
                  {contrato.clienteNombre
                    ? ` — ${contrato.clienteNombre}`
                    : ' — (sin cliente asociado)'}
                </option>
              ))}
            </select>
            {errores.contratoId && (
              <p className="mt-2 text-sm font-medium text-red-700">{errores.contratoId}</p>
            )}
          </>
        ) : (
          <Input
            label="ID de contrato *"
            type="number"
            min={1}
            value={form.contratoId}
            onChange={(evento) => setCampo('contratoId', evento.target.value)}
            placeholder="7"
            error={errores.contratoId}
          />
        )}
      </div>

      {contratoElegido && (
        <div className="rounded-xl backdrop-blur-md bg-white/40 border border-white/30 p-3 text-sm text-gray-800">
          <span className="font-semibold text-gray-900">{contratoElegido.titulo || 'Contrato'}</span>
          {contratoElegido.clienteNombre && <> · Cliente: {contratoElegido.clienteNombre}</>}
        </div>
      )}

      {necesitaCliente && clientes.length > 0 && (
        <div>
          <label className={labelClasses} htmlFor="invoice-contrato-cliente">
            <span className="inline-flex items-center gap-2">
              <FiUserPlus className="w-4 h-4 text-blue-700" />
              Cliente *
            </span>
          </label>
          <select
            id="invoice-contrato-cliente"
            value={form.clienteId}
            onChange={(evento) => setCampo('clienteId', evento.target.value)}
            className={`${controlClasses} cursor-pointer`}
          >
            <option value="">Selecciona a quién se factura…</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
                {cliente.documento ? ` — ${cliente.documento}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-700">
            Este contrato no tiene cliente asociado, así que hay que indicar aquí a quién se
            emite la factura.
          </p>
          {errores.clienteId && (
            <p className="mt-2 text-sm font-medium text-red-700">{errores.clienteId}</p>
          )}
        </div>
      )}

      <Input
        label="Concepto"
        value={form.concepto}
        onChange={(evento) => setCampo('concepto', evento.target.value)}
        placeholder="Honorarios del mandato de búsqueda PSI"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          label="Importe sin IVA (€)"
          type="text"
          inputMode="decimal"
          value={form.importe}
          onChange={(evento) => setCampo('importe', evento.target.value)}
          onBlur={(evento) => setCampo('importe', formatearImporte(evento.target.value))}
          placeholder="Del contrato"
          error={errores.importe}
        />

        <Input
          label="Cantidad"
          type="text"
          inputMode="decimal"
          value={form.cantidad}
          onChange={(evento) => setCampo('cantidad', evento.target.value)}
          onBlur={(evento) => setCampo('cantidad', formatearCantidad(evento.target.value))}
          placeholder="1"
        />

        <Input
          label="Tipo de IVA (%)"
          type="text"
          inputMode="decimal"
          value={form.tipoIva}
          onChange={(evento) => setCampo('tipoIva', evento.target.value)}
          onBlur={(evento) => setCampo('tipoIva', formatearCantidad(evento.target.value))}
          placeholder="21"
          error={errores.tipoIva}
        />

        <Input
          label="Fecha de emisión *"
          type="date"
          value={form.fechaEmision}
          onChange={(evento) => setCampo('fechaEmision', evento.target.value)}
          error={errores.fechaEmision}
        />
      </div>

      {form.importe.trim() && (
        <InvoiceTotalsPreview
          baseImponible={totales.baseImponible}
          cuotaIva={totales.cuotaIva}
          total={totales.total}
          tipoIva={form.tipoIva}
        />
      )}

      <div>
        <label className={labelClasses} htmlFor="invoice-contrato-notas">
          Observaciones
        </label>
        <textarea
          id="invoice-contrato-notas"
          rows={2}
          value={form.notas}
          onChange={(evento) => setCampo('notas', evento.target.value)}
          placeholder="Factura emitida al firmar el contrato."
          className={`${controlClasses} resize-y`}
        />
      </div>

      {Object.keys(errores).length > 0 && (
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
            <FiFilePlus className="w-4 h-4" />
            Emitir factura
          </span>
        </Button>
      </div>
    </form>
  );
};

/**
 * Modal para emitir una factura precargada desde un contrato existente. Como el
 * de alta, pide confirmación antes de tirar lo escrito.
 */
export const InvoiceFromContractModal = ({
  isOpen,
  contratos,
  clientes,
  saving,
  onClose,
  onSubmit,
}: InvoiceFromContractModalProps) => {
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
      <Modal isOpen={isOpen} onClose={intentarCerrar} title="Facturar un contrato" size="lg">
        <FromContractForm
          contratos={contratos}
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
        message="Has empezado a preparar esta factura y no la has emitido. ¿Descartas lo escrito?"
        confirmText="Descartar"
        cancelText="Seguir editando"
        variant="warning"
      />
    </>
  );
};
