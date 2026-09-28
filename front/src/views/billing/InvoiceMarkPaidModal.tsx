import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { hoyIso } from './invoice.helpers';
import type { Invoice } from './invoice.types';

interface InvoiceMarkPaidModalProps {
  /** Factura que se va a cobrar; `null` cierra el diálogo. */
  invoice: Invoice | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (invoice: Invoice, fechaCobro: string) => void;
}

/** Fecha propuesta: hoy, salvo que la factura se haya emitido más tarde. */
const fechaPropuesta = (invoice: Invoice): string => {
  const hoy = hoyIso();
  const emision = invoice.fechaEmision.slice(0, 10);
  return hoy < emision ? emision : hoy;
};

const Formulario = ({
  invoice,
  saving,
  onClose,
  onConfirm,
}: InvoiceMarkPaidModalProps & { invoice: Invoice }) => {
  const [fechaCobro, setFechaCobro] = useState(() => fechaPropuesta(invoice));
  const [error, setError] = useState('');

  const emision = invoice.fechaEmision.slice(0, 10);

  const handleSubmit = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();

    if (!fechaCobro) {
      setError('Indica la fecha en la que se cobró la factura');
      return;
    }
    if (fechaCobro < emision) {
      setError(`El cobro no puede ser anterior a la emisión (${formatDate(emision)})`);
      return;
    }

    setError('');
    onConfirm(invoice, fechaCobro);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl backdrop-blur-md bg-white/40 border border-white/30 p-4">
        <p className="text-base font-bold text-gray-900">{invoice.numero}</p>
        <p className="text-sm text-gray-700">{invoice.clienteNombre}</p>
        <p className="mt-2 text-lg font-bold text-blue-700 tabular-nums">
          {formatCurrency(invoice.total)}
        </p>
      </div>

      <Input
        label="Fecha del cobro *"
        type="date"
        min={emision}
        value={fechaCobro}
        onChange={(evento) => setFechaCobro(evento.target.value)}
        error={error}
      />

      <p className="text-sm text-gray-700">
        Si el ingreso entró otro día, corrige aquí la fecha. Se puede deshacer después desde el
        listado.
      </p>

      <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          <span className="inline-flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4" />
            Marcar cobrada
          </span>
        </Button>
      </div>
    </form>
  );
};

/**
 * Confirmación del cobro con fecha editable.
 *
 * Antes bastaba un clic en el icono verde del listado para dar por cobrada una
 * factura, con la fecha de hoy y sin vuelta atrás. Ahora se confirma, se puede
 * indicar el día real del ingreso y el cobro se puede deshacer.
 */
export const InvoiceMarkPaidModal = (props: InvoiceMarkPaidModalProps) => (
  <Modal
    isOpen={Boolean(props.invoice)}
    onClose={props.onClose}
    title="Marcar factura como cobrada"
    size="md"
  >
    {props.invoice && (
      <Formulario key={props.invoice.id} {...props} invoice={props.invoice} />
    )}
  </Modal>
);
