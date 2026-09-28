import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { FiSave } from 'react-icons/fi';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { useClientActions } from '../hooks/useClients';
import {
  BusinessLine,
  BusinessLineLabels,
  BusinessLineList,
  ClientStageLabels,
  ClientType,
  ClientTypeLabels,
  ClientTypeList,
  getStagesByBusinessLine,
  InterestZoneColors,
  InterestZoneLabels,
  InterestZoneList,
  OperationTypeLabels,
  OperationTypeList,
} from '../enums/clientEnums';
import type { InterestZone, OperationType } from '../enums/clientEnums';
import type { Client, SaveClientPayload } from '../requests/clients.requests';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` para dar de alta; un cliente para editarlo. */
  client?: Client | null;
  onSaved: () => void;
}

interface ClientFormState {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  documento: string;
  tipo: ClientType;
  lineaNegocio: BusinessLine;
  etapa: string;
  presupuestoMin: string;
  presupuestoMax: string;
  zonasInteres: InterestZone[];
  tipoOperacion: string;
  origen: string;
  notas: string;
}

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 text-gray-900 placeholder-gray-600 text-base';

const labelClasses = 'block text-base font-semibold text-gray-900 mb-2';

const emptyForm = (): ClientFormState => ({
  nombre: '',
  apellidos: '',
  email: '',
  telefono: '',
  documento: '',
  tipo: ClientType.INVERSOR,
  lineaNegocio: BusinessLine.PSI,
  etapa: getStagesByBusinessLine(BusinessLine.PSI)[0],
  presupuestoMin: '',
  presupuestoMax: '',
  zonasInteres: [],
  tipoOperacion: '',
  origen: '',
  notas: '',
});

const toForm = (client: Client): ClientFormState => ({
  nombre: client.nombre ?? '',
  apellidos: client.apellidos ?? '',
  email: client.email ?? '',
  telefono: client.telefono ?? '',
  documento: client.documento ?? '',
  tipo: client.tipo,
  lineaNegocio: client.lineaNegocio,
  etapa: client.etapa,
  presupuestoMin: client.presupuestoMin != null ? String(client.presupuestoMin) : '',
  presupuestoMax: client.presupuestoMax != null ? String(client.presupuestoMax) : '',
  zonasInteres: client.zonasInteres ?? [],
  tipoOperacion: client.tipoOperacion ?? '',
  origen: client.origen ?? '',
  notas: client.notas ?? '',
});

/** Cadena vacía -> `undefined`, para no enviar campos que el backend valida. */
const optionalText = (value: string): string | undefined =>
  value.trim() ? value.trim() : undefined;

/** Texto -> número, o `undefined` si está vacío o no es un número. */
const optionalNumber = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Alta y edición de la ficha de un cliente. */
export const ClientFormModal = ({
  isOpen,
  onClose,
  client = null,
  onSaved,
}: ClientFormModalProps) => {
  const { createClient, updateClient, isSaving } = useClientActions();
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(client);

  // Al abrir se carga la ficha (o se vacía el formulario para un alta nueva).
  // Es un ajuste durante el render, no un efecto: si se hiciera en un efecto,
  // el modal llegaría a pintarse una vez con los datos del cliente anterior.
  const [contextoPrevio, setContextoPrevio] = useState({ isOpen, client });
  if (contextoPrevio.isOpen !== isOpen || contextoPrevio.client !== client) {
    setContextoPrevio({ isOpen, client });
    if (isOpen) {
      setForm(client ? toForm(client) : emptyForm());
      setErrors({});
    }
  }

  const stages = useMemo(
    () => getStagesByBusinessLine(form.lineaNegocio),
    [form.lineaNegocio],
  );

  const handleChange = <K extends keyof ClientFormState>(
    key: K,
    value: ClientFormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  /** Al cambiar de línea, la etapa debe pasar a una válida de la nueva. */
  const handleBusinessLineChange = (lineaNegocio: BusinessLine) => {
    setForm((previous) => {
      const nuevasEtapas = getStagesByBusinessLine(lineaNegocio);
      return {
        ...previous,
        lineaNegocio,
        etapa: nuevasEtapas.includes(previous.etapa as (typeof nuevasEtapas)[number])
          ? previous.etapa
          : nuevasEtapas[0],
      };
    });
  };

  const toggleZone = (zone: InterestZone) => {
    setForm((previous) => ({
      ...previous,
      zonasInteres: previous.zonasInteres.includes(zone)
        ? previous.zonasInteres.filter((selected) => selected !== zone)
        : [...previous.zonasInteres, zone],
    }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!form.nombre.trim()) {
      nextErrors.nombre = 'El nombre es obligatorio';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'El correo electrónico no es válido';
    }

    const min = optionalNumber(form.presupuestoMin);
    const max = optionalNumber(form.presupuestoMax);
    if (min !== undefined && max !== undefined && min > max) {
      nextErrors.presupuestoMax =
        'El presupuesto máximo debe ser mayor que el mínimo';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const payload: SaveClientPayload = {
      nombre: form.nombre.trim(),
      apellidos: optionalText(form.apellidos),
      email: optionalText(form.email)?.toLowerCase(),
      telefono: optionalText(form.telefono),
      documento: optionalText(form.documento),
      tipo: form.tipo,
      lineaNegocio: form.lineaNegocio,
      etapa: form.etapa,
      presupuestoMin: optionalNumber(form.presupuestoMin),
      presupuestoMax: optionalNumber(form.presupuestoMax),
      zonasInteres: form.zonasInteres,
      tipoOperacion: form.tipoOperacion
        ? (form.tipoOperacion as OperationType)
        : undefined,
      origen: optionalText(form.origen),
      notas: optionalText(form.notas),
    };

    const saved = client
      ? await updateClient(client.id, payload)
      : await createClient(payload);

    if (saved) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar cliente' : 'Nuevo cliente'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* --- Datos de contacto --- */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider select-none">
            Datos de contacto
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre *"
              value={form.nombre}
              onChange={(event) => handleChange('nombre', event.target.value)}
              placeholder="Marta"
              error={errors.nombre}
              autoFocus
            />
            <Input
              label="Apellidos"
              value={form.apellidos}
              onChange={(event) => handleChange('apellidos', event.target.value)}
              placeholder="Ferrer Blanch"
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(event) => handleChange('email', event.target.value)}
              placeholder="marta.bermejo@example.com"
              error={errors.email}
            />
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(event) => handleChange('telefono', event.target.value)}
              placeholder="600123456"
            />
            <Input
              label="Documento (NIF / CIF / NIE)"
              value={form.documento}
              onChange={(event) => handleChange('documento', event.target.value)}
              placeholder="00000001R"
            />
            <div>
              <label className={labelClasses} htmlFor="cliente-tipo">
                Tipo de cliente
              </label>
              <select
                id="cliente-tipo"
                value={form.tipo}
                onChange={(event) =>
                  handleChange('tipo', event.target.value as ClientType)
                }
                className={`${controlClasses} cursor-pointer`}
              >
                {ClientTypeList.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ClientTypeLabels[tipo]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* --- Pipeline --- */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider select-none">
            Seguimiento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses} htmlFor="cliente-linea">
                Línea de negocio
              </label>
              <select
                id="cliente-linea"
                value={form.lineaNegocio}
                onChange={(event) =>
                  handleBusinessLineChange(event.target.value as BusinessLine)
                }
                className={`${controlClasses} cursor-pointer`}
              >
                {BusinessLineList.map((linea) => (
                  <option key={linea} value={linea}>
                    {BusinessLineLabels[linea]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses} htmlFor="cliente-etapa">
                Etapa
              </label>
              <select
                id="cliente-etapa"
                value={form.etapa}
                onChange={(event) => handleChange('etapa', event.target.value)}
                className={`${controlClasses} cursor-pointer`}
              >
                {stages.map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {ClientStageLabels[etapa]}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Origen"
              value={form.origen}
              onChange={(event) => handleChange('origen', event.target.value)}
              placeholder="Portal inmobiliario, referida, web..."
            />
          </div>
        </section>

        {/* --- Perfil inversor --- */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider select-none">
            Perfil inversor
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Presupuesto mínimo (€)"
              type="number"
              min={0}
              value={form.presupuestoMin}
              onChange={(event) => handleChange('presupuestoMin', event.target.value)}
              placeholder="120000"
            />
            <Input
              label="Presupuesto máximo (€)"
              type="number"
              min={0}
              value={form.presupuestoMax}
              onChange={(event) => handleChange('presupuestoMax', event.target.value)}
              placeholder="180000"
              error={errors.presupuestoMax}
            />
            <div>
              <label className={labelClasses} htmlFor="cliente-operacion">
                Tipo de operación
              </label>
              <select
                id="cliente-operacion"
                value={form.tipoOperacion}
                onChange={(event) => handleChange('tipoOperacion', event.target.value)}
                className={`${controlClasses} cursor-pointer`}
              >
                <option value="">Sin especificar</option>
                {OperationTypeList.map((operacion) => (
                  <option key={operacion} value={operacion}>
                    {OperationTypeLabels[operacion]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className={labelClasses}>Zonas de interés</span>
            <div className="flex flex-wrap gap-2">
              {InterestZoneList.map((zona) => {
                const isSelected = form.zonasInteres.includes(zona);
                return (
                  <button
                    key={zona}
                    type="button"
                    onClick={() => toggleZone(zona)}
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all cursor-pointer select-none ${
                      isSelected
                        ? `${InterestZoneColors[zona]} shadow-sm ring-2 ring-blue-500/40`
                        : 'backdrop-blur-md bg-white/30 text-gray-700 border-white/30 hover:bg-white/45'
                    }`}
                  >
                    {InterestZoneLabels[zona]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* --- Notas --- */}
        <div>
          <label className={labelClasses} htmlFor="cliente-notas">
            Notas
          </label>
          <textarea
            id="cliente-notas"
            rows={4}
            value={form.notas}
            onChange={(event) => handleChange('notas', event.target.value)}
            placeholder="Preferencias, disponibilidad, rentabilidad objetivo..."
            className={`${controlClasses} resize-y`}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving} className="flex items-center gap-2">
            <FiSave className="w-4 h-4" />
            {isEditing ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
