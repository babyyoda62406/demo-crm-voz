import { getErrorMessage } from '../../../helpers/errorHandler';
import { ContractFieldType, ContractState } from '../types/contracts.types';
import type {
  ClienteOpcion,
  ContractFormValues,
  ContractListRow,
  ContractStateValue,
  ContractTemplate,
  ContractTemplateField,
  PropiedadOpcion,
} from '../types/contracts.types';

/**
 * Mensaje de error dando prioridad al que devuelve la API.
 *
 * `getErrorMessage` traduce el `flag` antes de mirar el `message`, así que un
 * 400 con «Máximo 4 ocupantes» acababa saliendo como «Error de validación.
 * Revisa los datos introducidos». En contratos los mensajes del backend son
 * concretos y accionables, y son los que tiene que leer la persona usuaria.
 */
export const mensajeDeApi = (error: unknown, porDefecto: string): string => {
  const mensaje = (
    error as { response?: { data?: { message?: unknown } } } | undefined
  )?.response?.data?.message;

  if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
  if (Array.isArray(mensaje) && typeof mensaje[0] === 'string') return mensaje[0];

  return getErrorMessage(error, porDefecto);
};

/** Etiqueta en español de cada estado. */
export const contractStateLabels: Record<ContractStateValue, string> = {
  [ContractState.BORRADOR]: 'Borrador',
  [ContractState.ENVIADO]: 'Enviado',
  [ContractState.VISTO]: 'Visto',
  [ContractState.FIRMADO]: 'Firmado',
  [ContractState.ANULADO]: 'Anulado',
};

/** Clases del badge de estado (glassmorphism coherente con el resto). */
export const contractStateClasses: Record<ContractStateValue, string> = {
  [ContractState.BORRADOR]: 'bg-gray-500/15 text-gray-700 border-gray-400/40',
  [ContractState.ENVIADO]: 'bg-blue-600/15 text-blue-800 border-blue-500/40',
  [ContractState.VISTO]: 'bg-amber-500/20 text-amber-800 border-amber-500/40',
  [ContractState.FIRMADO]:
    'bg-emerald-500/20 text-emerald-800 border-emerald-500/40',
  [ContractState.ANULADO]: 'bg-red-500/15 text-red-800 border-red-500/40',
};

/** Orden del ciclo de vida, para la línea de tiempo del detalle. */
export const contractStateFlow: ContractStateValue[] = [
  ContractState.BORRADOR,
  ContractState.ENVIADO,
  ContractState.VISTO,
  ContractState.FIRMADO,
];

/** Nombres de mes en español (encabezados «a 11 de agosto de 2026»). */
export const mesesEs = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Fila vacía de un campo de tipo LISTA. */
export const filaVacia = (campo: ContractTemplateField): ContractListRow => {
  const fila: ContractListRow = {};
  (campo.subFields ?? []).forEach((sub) => {
    fila[sub.name] = '';
  });
  return fila;
};

/**
 * Valores iniciales del formulario de una plantilla: valores por defecto de
 * cada campo, la fecha de hoy en el encabezado y una fila en cada lista.
 */
export const valoresIniciales = (
  plantilla: ContractTemplate,
  precarga: Record<string, unknown> = {},
): ContractFormValues => {
  const hoy = new Date();
  const valores: ContractFormValues = {};

  plantilla.campos.forEach((campo) => {
    const previo = precarga[campo.name];

    if (campo.type === ContractFieldType.LISTA) {
      const filas = Array.isArray(previo) ? (previo as ContractListRow[]) : [];
      valores[campo.name] = filas.length > 0 ? filas : [filaVacia(campo)];
      return;
    }

    if (previo !== undefined && previo !== null && previo !== '') {
      valores[campo.name] = String(previo);
      return;
    }

    valores[campo.name] = campo.defaultValue ?? '';
  });

  // El encabezado se rellena con la fecha de hoy si la plantilla lo pide.
  if ('diaContrato' in valores && !valores.diaContrato) {
    valores.diaContrato = String(hoy.getDate());
  }
  if ('mesContrato' in valores && !valores.mesContrato) {
    valores.mesContrato = mesesEs[hoy.getMonth()];
  }
  if ('anioContrato' in valores && !valores.anioContrato) {
    valores.anioContrato = String(hoy.getFullYear());
  }

  return valores;
};

/** Agrupa los campos por su `group` conservando el orden de declaración. */
export const agruparCampos = (
  campos: ContractTemplateField[],
): { grupo: string; campos: ContractTemplateField[] }[] => {
  const grupos: { grupo: string; campos: ContractTemplateField[] }[] = [];

  campos.forEach((campo) => {
    const nombre = campo.group ?? 'Datos del contrato';
    const existente = grupos.find((g) => g.grupo === nombre);
    if (existente) existente.campos.push(campo);
    else grupos.push({ grupo: nombre, campos: [campo] });
  });

  return grupos;
};

/** Campos obligatorios sin rellenar. Devuelve las etiquetas que faltan. */
export const camposIncompletos = (
  plantilla: ContractTemplate,
  valores: ContractFormValues,
): string[] =>
  plantilla.campos
    .filter((campo) => campo.required)
    .filter((campo) => {
      const valor = valores[campo.name];
      if (campo.type === ContractFieldType.LISTA) {
        const filas = Array.isArray(valor) ? valor : [];
        return !filas.some((fila) =>
          Object.values(fila).some((v) => String(v).trim() !== ''),
        );
      }
      return String(valor ?? '').trim() === '';
    })
    .map((campo) => campo.label);

/** Tipo de `<input>` HTML adecuado para cada tipo de campo. */
export const inputTypeFor = (tipo: ContractTemplateField['type']): string => {
  switch (tipo) {
    case ContractFieldType.EMAIL:
      return 'email';
    case ContractFieldType.TELEFONO:
      return 'tel';
    case ContractFieldType.NUMERO:
    case ContractFieldType.MONEDA:
      return 'text';
    default:
      return 'text';
  }
};

// ---------------------------------------------------------------------------
// Precarga desde el cliente y el inmueble elegidos en el asistente
//
// El mapa va del dato del CRM a los marcadores que usan las cinco plantillas.
// Solo se rellenan los campos que la plantilla declara y solo cuando el dato de
// origen tiene valor: elegir un cliente nunca debe vaciar algo ya escrito.
// ---------------------------------------------------------------------------

const CAMPOS_DEL_CLIENTE: Record<keyof ClienteOpcion | string, string[]> = {
  nombre: [
    'arrendatarioRazonSocial',
    'empresaRazonSocial',
    'clienteNombre',
    'nuevoInquilinoNombre',
    'firmanteNombre',
  ],
  documento: [
    'arrendatarioCif',
    'empresaCif',
    'clienteDni',
    'nuevoInquilinoDni',
    'firmanteDni',
  ],
  direccion: [
    'arrendatarioDomicilio',
    'arrendatarioDomicilioNotificaciones',
    'empresaDomicilio',
    'clienteDomicilio',
    'nuevoInquilinoDomicilio',
    'firmanteDomicilio',
  ],
  email: ['arrendatarioEmail', 'nuevoInquilinoEmail'],
  telefono: ['nuevoInquilinoTelefono'],
};

/** Marcadores de la plantilla que se rellenan con el cliente elegido. */
export const precargaDesdeCliente = (
  plantilla: ContractTemplate,
  cliente: ClienteOpcion,
): ContractFormValues => {
  const existentes = new Set(plantilla.campos.map((campo) => campo.name));
  const valores: ContractFormValues = {};

  Object.entries(CAMPOS_DEL_CLIENTE).forEach(([origen, destinos]) => {
    const valor = cliente[origen as keyof ClienteOpcion];
    if (typeof valor !== 'string' || !valor.trim()) return;
    destinos
      .filter((destino) => existentes.has(destino))
      .forEach((destino) => {
        valores[destino] = valor.trim();
      });
  });

  return valores;
};

/**
 * Marcadores que se rellenan con el inmueble elegido.
 *
 * Solo la dirección: el precio de la ficha es el de venta y colarlo como renta
 * mensual escribiría una cifra equivocada dentro de un contrato.
 */
export const precargaDesdePropiedad = (
  plantilla: ContractTemplate,
  propiedad: PropiedadOpcion,
): ContractFormValues => {
  const existentes = new Set(plantilla.campos.map((campo) => campo.name));
  const valores: ContractFormValues = {};

  const direccion = [propiedad.direccion, propiedad.poblacion]
    .filter((parte) => parte && String(parte).trim())
    .join(', ');

  if (direccion && existentes.has('direccionInmueble')) {
    valores.direccionInmueble = direccion;
  }

  return valores;
};

/** Resumen corto de un contrato para tarjetas y tooltips. */
export const resumenContrato = (
  titulo: string,
  maximo = 60,
): string => (titulo.length > maximo ? `${titulo.slice(0, maximo - 1)}…` : titulo);
