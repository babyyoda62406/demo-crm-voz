/**
 * Tipos de campo admitidos por el formulario dinamico de contratos.
 * El front (`views/contracts`) pinta un control distinto para cada uno.
 */
export enum ContractFieldType {
  /** Texto de una linea. */
  TEXTO = 'texto',
  /** Texto multilinea (direcciones largas, listados). */
  TEXTO_LARGO = 'texto-largo',
  /** Numero con separador de miles (se envia ya formateado a la plantilla). */
  NUMERO = 'numero',
  /** Importe en euros. Puede alimentar automaticamente su campo "en letras". */
  MONEDA = 'moneda',
  /** Fecha (se serializa como dd/mm/aaaa al rellenar la plantilla). */
  FECHA = 'fecha',
  /** Correo electronico. */
  EMAIL = 'email',
  /** Numero de cuenta IBAN. */
  IBAN = 'iban',
  /** Documento de identidad (DNI / NIE / CIF). */
  DOCUMENTO = 'documento',
  /** Telefono. */
  TELEFONO = 'telefono',
  /** Lista repetible: alimenta un bucle `{#campo}...{/campo}` de la plantilla. */
  LISTA = 'lista',
}
