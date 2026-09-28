import { ContractFieldType } from '../enums/contract-field-type.enum';

/**
 * Definicion de un campo (marcador `{campo}`) de una plantilla .docx.
 * Se guarda en la columna JSON `campos` de `ContractTemplate` y viaja al front
 * tal cual para construir el formulario dinamico del asistente de creacion.
 */
export interface IContractTemplateField {
  /** Nombre del marcador dentro del .docx, sin llaves. */
  name: string;
  /** Etiqueta que ve la persona usuaria en el formulario. */
  label: string;
  /** Tipo de control. */
  type: ContractFieldType;
  /** Si el contrato no puede generarse sin este dato. */
  required?: boolean;
  /** Bloque del formulario en el que se agrupa el campo. */
  group?: string;
  /** Texto de ayuda bajo el control. */
  help?: string;
  /** Texto de ejemplo dentro del control. */
  placeholder?: string;
  /** Valor por defecto al abrir el formulario. */
  defaultValue?: string;
  /**
   * Campo del que se deriva automaticamente este valor si se deja vacio.
   * Se usa para pasar importes a letras (`precioMensualCifra` -> `precioMensualLetras`).
   */
  derivedFromAmount?: string;
  /** Ancho relativo sugerido en el formulario (1 = media fila, 2 = fila entera). */
  span?: 1 | 2;
  /** Subcampos, solo para `type: LISTA`. */
  subFields?: IContractTemplateField[];
  /**
   * Numero maximo de filas, solo para `type: LISTA`. El formulario deshabilita
   * «Anadir» al alcanzarlo y el backend lo valida (ver `validarLimitesDeLista`).
   */
  maxRows?: number;
}

/** Origen de precarga de un campo cuando se elige cliente o inmueble. */
export interface IContractPrefillMap {
  /** Campos que se rellenan con datos del cliente seleccionado. */
  cliente?: Record<string, string>;
  /** Campos que se rellenan con datos del inmueble seleccionado. */
  propiedad?: Record<string, string>;
}
