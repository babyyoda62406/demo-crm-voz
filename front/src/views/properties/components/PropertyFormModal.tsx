import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { FiAlertCircle, FiSave } from 'react-icons/fi';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { TagInput } from '../../../components/TagInput';
import type { Tag } from '../../../components/TagInput';
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PROPERTY_ZONES,
  PropertyStatusLabels,
  PropertyTypeLabels,
  PropertyZoneLabels,
} from '../enums/propertyCatalogs';
import type {
  Property,
  PropertyPayload,
  PropertyStatus,
  PropertyType,
  PropertyZone,
} from '../types/property.types';
import { PhotoUploader } from './PhotoUploader';

interface PropertyFormModalProps {
  isOpen: boolean;
  /** Inmueble a editar; `null` para dar de alta uno nuevo. */
  property: Property | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: PropertyPayload) => Promise<boolean>;
}

interface FormState {
  referencia: string;
  titulo: string;
  tipo: PropertyType;
  zona: PropertyZone;
  estado: PropertyStatus;
  direccion: string;
  poblacion: string;
  codigoPostal: string;
  precio: string;
  superficie: string;
  habitaciones: string;
  rentabilidadEstimada: string;
  descripcion: string;
  notas: string;
}

const controlClasses =
  'w-full px-4 py-3 backdrop-blur-md bg-white/50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 text-base transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm';

const labelClasses = 'block text-base font-semibold text-gray-900 mb-2';

/**
 * El texto de ejemplo debe leerse como sugerencia, no como dato ya escrito.
 * Rebaja el contraste del `placeholder` que trae el componente `Input`.
 */
const placeholderSuave = 'placeholder-gray-400!';

const buildInitialState = (property: Property | null): FormState => ({
  referencia: property?.referencia ?? '',
  titulo: property?.titulo ?? '',
  tipo: property?.tipo ?? 'piso',
  zona: property?.zona ?? 'altabria',
  estado: property?.estado ?? 'disponible',
  direccion: property?.direccion ?? '',
  poblacion: property?.poblacion ?? '',
  codigoPostal: property?.codigoPostal ?? '',
  precio: property ? String(property.precio) : '',
  superficie: property ? String(property.superficie) : '',
  habitaciones: property ? String(property.habitaciones) : '',
  rentabilidadEstimada:
    property?.rentabilidadEstimada !== null && property?.rentabilidadEstimada !== undefined
      ? String(property.rentabilidadEstimada)
      : '',
  descripcion: property?.descripcion ?? '',
  notas: property?.notas ?? '',
});

const buildInitialTags = (property: Property | null): Tag[] =>
  (property?.caracteristicas ?? []).map((name, posicion) => ({
    id: `caracteristica-${posicion}-${name}`,
    name,
  }));

/** Convierte un campo numérico de texto a número, o `undefined` si está vacío. */
const parseNumber = (value: string): number | undefined => {
  const limpio = value.trim().replace(',', '.');
  if (!limpio) return undefined;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : undefined;
};

/** Huella del formulario, para saber si queda trabajo sin guardar. */
const huella = (form: FormState, caracteristicas: Tag[], fotos: string[]): string =>
  JSON.stringify([form, caracteristicas.map((tag) => tag.name), fotos]);

/** Formulario de alta y edición del inmueble, con subida de fotos incluida. */
const PropertyForm = ({
  property,
  saving,
  onClose,
  onSubmit,
  onDirtyChange,
}: Omit<PropertyFormModalProps, 'isOpen'> & { onDirtyChange: (sucio: boolean) => void }) => {
  const [form, setForm] = useState<FormState>(() => buildInitialState(property));
  const [caracteristicas, setCaracteristicas] = useState<Tag[]>(() => buildInitialTags(property));
  const [fotos, setFotos] = useState<string[]>(() => property?.fotos ?? []);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const huellaInicial = useRef(
    huella(buildInitialState(property), buildInitialTags(property), property?.fotos ?? []),
  );

  useEffect(() => {
    onDirtyChange(huella(form, caracteristicas, fotos) !== huellaInicial.current);
  }, [form, caracteristicas, fotos, onDirtyChange]);

  const setCampo = <K extends keyof FormState>(campo: K, valor: FormState[K]) =>
    setForm((actual) => ({ ...actual, [campo]: valor }));

  const validar = (): Record<string, string> => {
    const nuevos: Record<string, string> = {};
    if (!form.titulo.trim()) nuevos.titulo = 'El título es obligatorio';
    if (!form.direccion.trim()) nuevos.direccion = 'La dirección es obligatoria';

    const precio = parseNumber(form.precio);
    if (precio === undefined) nuevos.precio = 'Indica el precio en euros';
    else if (precio < 0) nuevos.precio = 'El precio no puede ser negativo';

    const rentabilidad = parseNumber(form.rentabilidadEstimada);
    if (form.rentabilidadEstimada.trim() && rentabilidad === undefined) {
      nuevos.rentabilidadEstimada = 'Introduce un porcentaje válido';
    } else if (rentabilidad !== undefined && (rentabilidad < 0 || rentabilidad > 100)) {
      nuevos.rentabilidadEstimada = 'La rentabilidad debe estar entre 0 y 100';
    }

    const superficie = parseNumber(form.superficie);
    if (form.superficie.trim() && superficie === undefined) {
      nuevos.superficie = 'Introduce los metros cuadrados en números';
    } else if (superficie !== undefined && superficie < 0) {
      nuevos.superficie = 'La superficie no puede ser negativa';
    }

    const habitaciones = parseNumber(form.habitaciones);
    if (form.habitaciones.trim() && habitaciones === undefined) {
      nuevos.habitaciones = 'Introduce el número de habitaciones';
    } else if (habitaciones !== undefined && (habitaciones < 0 || !Number.isInteger(habitaciones))) {
      nuevos.habitaciones = 'Las habitaciones deben ser un número entero de 0 en adelante';
    }

    return nuevos;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nuevosErrores = validar();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const payload: PropertyPayload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      zona: form.zona,
      estado: form.estado,
      direccion: form.direccion.trim(),
      precio: parseNumber(form.precio) ?? 0,
      superficie: parseNumber(form.superficie),
      habitaciones: parseNumber(form.habitaciones),
      rentabilidadEstimada: parseNumber(form.rentabilidadEstimada),
      caracteristicas: caracteristicas.map((tag) => tag.name),
      fotos,
    };

    if (form.referencia.trim()) payload.referencia = form.referencia.trim();
    if (form.poblacion.trim()) payload.poblacion = form.poblacion.trim();
    if (form.codigoPostal.trim()) payload.codigoPostal = form.codigoPostal.trim();
    if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim();
    if (form.notas.trim()) payload.notas = form.notas.trim();

    await onSubmit(payload);
  };

  return (
    // `noValidate`: la validación la hace `validar()` y los avisos salen en
    // español; los globos nativos del navegador vienen en su propio idioma.
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Título *"
            value={form.titulo}
            onChange={(event) => setCampo('titulo', event.target.value)}
            placeholder="Piso reformado junto al centro"
            error={errores.titulo}
            className={placeholderSuave}
          />
        </div>

        <div>
          <label className={labelClasses} htmlFor="property-tipo">
            Tipo
          </label>
          <select
            id="property-tipo"
            value={form.tipo}
            onChange={(event) => setCampo('tipo', event.target.value as PropertyType)}
            className={`${controlClasses} cursor-pointer`}
          >
            {PROPERTY_TYPES.map((tipo) => (
              <option key={tipo} value={tipo}>
                {PropertyTypeLabels[tipo]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClasses} htmlFor="property-estado">
            Estado
          </label>
          <select
            id="property-estado"
            value={form.estado}
            onChange={(event) => setCampo('estado', event.target.value as PropertyStatus)}
            className={`${controlClasses} cursor-pointer`}
          >
            {PROPERTY_STATUSES.map((estado) => (
              <option key={estado} value={estado}>
                {PropertyStatusLabels[estado]}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <Input
            label="Dirección *"
            value={form.direccion}
            onChange={(event) => setCampo('direccion', event.target.value)}
            placeholder="Calle del Norte, 24, 3º 1ª"
            error={errores.direccion}
            className={placeholderSuave}
          />
        </div>

        <div>
          <label className={labelClasses} htmlFor="property-zona">
            Zona
          </label>
          <select
            id="property-zona"
            value={form.zona}
            onChange={(event) => setCampo('zona', event.target.value as PropertyZone)}
            className={`${controlClasses} cursor-pointer`}
          >
            {PROPERTY_ZONES.map((zona) => (
              <option key={zona} value={zona}>
                {PropertyZoneLabels[zona]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Población"
            value={form.poblacion}
            onChange={(event) => setCampo('poblacion', event.target.value)}
            placeholder="Altabria"
            className={placeholderSuave}
          />
          <Input
            label="C. P."
            value={form.codigoPostal}
            onChange={(event) => setCampo('codigoPostal', event.target.value)}
            placeholder="00110"
            className={placeholderSuave}
          />
        </div>

        <Input
          label="Precio (€) *"
          type="number"
          min={0}
          step="any"
          value={form.precio}
          onChange={(event) => setCampo('precio', event.target.value)}
          placeholder="165000"
          error={errores.precio}
          className={placeholderSuave}
        />

        <Input
          label="Rentabilidad estimada (%)"
          type="number"
          min={0}
          max={100}
          step="any"
          value={form.rentabilidadEstimada}
          onChange={(event) => setCampo('rentabilidadEstimada', event.target.value)}
          placeholder="6.4"
          error={errores.rentabilidadEstimada}
          className={placeholderSuave}
        />

        <Input
          label="Superficie (m²)"
          type="number"
          min={0}
          step="any"
          value={form.superficie}
          onChange={(event) => setCampo('superficie', event.target.value)}
          placeholder="82"
          error={errores.superficie}
          className={placeholderSuave}
        />

        <Input
          label="Habitaciones"
          type="number"
          min={0}
          step="1"
          value={form.habitaciones}
          onChange={(event) => setCampo('habitaciones', event.target.value)}
          placeholder="3"
          error={errores.habitaciones}
          className={placeholderSuave}
        />

        <div className="sm:col-span-2">
          <Input
            label="Referencia"
            value={form.referencia}
            onChange={(event) => setCampo('referencia', event.target.value)}
            placeholder="Se genera automáticamente si se deja en blanco"
            className={placeholderSuave}
          />
        </div>
      </div>

      <div>
        <label className={labelClasses}>Características</label>
        <TagInput
          tags={caracteristicas}
          onChange={setCaracteristicas}
          placeholder="Ascensor, terraza, a reformar..."
        />
      </div>

      <PhotoUploader
        fotos={fotos}
        onChange={setFotos}
        propertyId={property?.id}
        fotosGuardadas={property?.fotos ?? []}
      />

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={labelClasses} htmlFor="property-descripcion">
            Descripción
          </label>
          <textarea
            id="property-descripcion"
            rows={3}
            value={form.descripcion}
            onChange={(event) => setCampo('descripcion', event.target.value)}
            placeholder="Finca de 1975 con ascensor, muy luminoso y exterior."
            className={`${controlClasses} resize-y`}
          />
        </div>

        <div>
          <label className={labelClasses} htmlFor="property-notas">
            Notas internas
          </label>
          <textarea
            id="property-notas"
            rows={2}
            value={form.notas}
            onChange={(event) => setCampo('notas', event.target.value)}
            placeholder="La propiedad acepta arras en 15 días."
            className={`${controlClasses} resize-y`}
          />
        </div>
      </div>

      {Object.keys(errores).length > 0 && (
        <p className="flex items-center gap-2 text-sm font-medium text-red-700">
          <FiAlertCircle className="w-4 h-4" />
          Revisa los campos marcados antes de guardar.
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          <span className="inline-flex items-center gap-2">
            <FiSave className="w-4 h-4" />
            {property ? 'Guardar cambios' : 'Crear inmueble'}
          </span>
        </Button>
      </div>
    </form>
  );
};

/** Modal de alta y edición de un inmueble de la cartera. */
export const PropertyFormModal = ({
  isOpen,
  property,
  saving,
  onClose,
  onSubmit,
}: PropertyFormModalProps) => {
  const [sucio, setSucio] = useState(false);

  const [abiertoPrevio, setAbiertoPrevio] = useState(isOpen);
  if (abiertoPrevio !== isOpen) {
    setAbiertoPrevio(isOpen);
    if (!isOpen) setSucio(false);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={property ? `Editar ${property.referencia}` : 'Nuevo inmueble'}
      size="xl"
      confirmClose={sucio}
      confirmCloseMessage="Se perderá lo que hayas escrito en la ficha del inmueble."
    >
      <PropertyForm
        key={property?.id ?? 'nuevo'}
        property={property}
        saving={saving}
        onClose={onClose}
        onSubmit={onSubmit}
        onDirtyChange={setSucio}
      />
    </Modal>
  );
};
