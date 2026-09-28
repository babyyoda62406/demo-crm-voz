/**
 * Tipos del dominio Contratos. Reflejan las entidades y DTO del backend
 * (`back/src/contracts`). Si cambia una firma allí, se actualiza aquí.
 */

/** Estados del ciclo de vida de un contrato. */
export const ContractState = {
  BORRADOR: 'borrador',
  ENVIADO: 'enviado',
  VISTO: 'visto',
  FIRMADO: 'firmado',
  ANULADO: 'anulado',
} as const;

export type ContractStateValue = (typeof ContractState)[keyof typeof ContractState];

/** Tipos de campo admitidos por el formulario dinámico. */
export const ContractFieldType = {
  TEXTO: 'texto',
  TEXTO_LARGO: 'texto-largo',
  NUMERO: 'numero',
  MONEDA: 'moneda',
  FECHA: 'fecha',
  EMAIL: 'email',
  IBAN: 'iban',
  DOCUMENTO: 'documento',
  TELEFONO: 'telefono',
  LISTA: 'lista',
} as const;

export type ContractFieldTypeValue =
  (typeof ContractFieldType)[keyof typeof ContractFieldType];

/** Definición de un marcador `{campo}` de una plantilla .docx. */
export interface ContractTemplateField {
  name: string;
  label: string;
  type: ContractFieldTypeValue;
  required?: boolean;
  group?: string;
  help?: string;
  placeholder?: string;
  defaultValue?: string;
  derivedFromAmount?: string;
  span?: 1 | 2;
  subFields?: ContractTemplateField[];
  /** Máximo de filas de un campo LISTA (p. ej. 4 ocupantes). */
  maxRows?: number;
}

/** Cliente encontrado por el buscador del asistente. */
export interface ClienteOpcion {
  id: number;
  nombre: string;
  documento?: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

/** Inmueble encontrado por el buscador del asistente. */
export interface PropiedadOpcion {
  id: number;
  referencia?: string | null;
  titulo?: string | null;
  direccion: string;
  poblacion?: string | null;
  precio?: number | null;
}

/** Plantilla registrada en el sistema. */
export interface ContractTemplate {
  id: number;
  key: string;
  nombre: string;
  descripcion?: string;
  archivo: string;
  categoria?: string;
  icono?: string;
  campos: ContractTemplateField[];
  admiteProrroga: boolean;
  plantillaProrroga?: string | null;
  orden: number;
  activo: boolean;
}

/** Contrato generado. */
export interface Contract {
  id: number;
  referencia: string;
  titulo: string;
  template?: ContractTemplate | null;
  templateId?: number | null;
  templateKey: string;
  datos: Record<string, unknown>;
  clienteId?: number | null;
  clienteNombre?: string | null;
  propiedadId?: number | null;
  propiedadDireccion?: string | null;
  estado: ContractStateValue;
  docxPath?: string | null;
  pdfPath?: string | null;
  publicToken?: string | null;
  destinatarioEmail?: string | null;
  enviadoAt?: string | null;
  vistoAt?: string | null;
  firmadoAt?: string | null;
  firmanteNombre?: string | null;
  contratoOrigenId?: number | null;
  notas?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Fila de un campo de tipo LISTA (p. ej. los ocupantes del alquiler). */
export type ContractListRow = Record<string, string>;

/** Valores del formulario dinámico. */
export type ContractFormValues = Record<string, string | ContractListRow[]>;

/** Cuerpo de creación de un contrato. */
export interface CreateContractBody {
  templateKey: string;
  titulo?: string;
  datos: ContractFormValues;
  clienteId?: number;
  clienteNombre?: string;
  propiedadId?: number;
  propiedadDireccion?: string;
  notas?: string;
}

/** Respuesta del envío a firma. */
export interface ContractSendResult {
  contrato: Contract;
  enlacePublico: string;
  enlaceAplicacion: string;
}

/** Estado público consultado desde el enlace de firma. */
export interface PublicContractView {
  referencia: string;
  titulo: string;
  plantilla: string;
  estado: ContractStateValue;
  estadoEtiqueta: string;
  tienePdf: boolean;
  firmanteNombre: string | null;
  firmadoAt: string | null;
  enviadoAt: string | null;
  /** Marca de la agencia que envía el documento. */
  agenciaNombre: string;
  agenciaDescripcion: string;
}
