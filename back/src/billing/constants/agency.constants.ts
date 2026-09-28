/**
 * Datos fiscales de la agencia que emite las facturas.
 *
 * Los valores por defecto son FICTICIOS (ver «Sobre esta versión pública» en el
 * README): en un despliegue real se sobreescriben por entorno con el CIF, el
 * domicilio social y el IBAN de cobro que figuran en los contratos firmados.
 *
 * Único punto del módulo donde viven estos datos: la plantilla del PDF los lee
 * de aquí y no debe repetirlos. Cada campo admite además una variable de
 * entorno con el mismo nombre en mayúsculas (`AGENCY_CIF`, `AGENCY_IBAN`...),
 * para poder corregir un dato en producción sin volver a desplegar.
 */
export interface IAgencyData {
  nombre: string;
  cif: string;
  direccion: string;
  codigoPostal: string;
  poblacion: string;
  provincia: string;
  /** Opcional: si queda vacío, la factura no imprime la línea de teléfono. */
  telefono: string;
  email: string;
  web: string;
  iban: string;
}

/** Valor de la variable de entorno si existe; si no, el dato por defecto. */
const dato = (variable: string, valor: string): string => {
  const configurado = process.env[variable];
  return configurado === undefined ? valor : configurado.trim();
};

export const AGENCY: IAgencyData = {
  nombre: dato('AGENCY_NOMBRE', 'Vantia Patrimonio S.L.'),
  cif: dato('AGENCY_CIF', 'B00000000'),
  direccion: dato('AGENCY_DIRECCION', 'Calle Mayor 1, 1.º'),
  codigoPostal: dato('AGENCY_CODIGO_POSTAL', '00110'),
  poblacion: dato('AGENCY_POBLACION', 'Altabria'),
  provincia: dato('AGENCY_PROVINCIA', 'Nortia'),
  // Vacío a propósito: antes que imprimir un teléfono inventado en un documento
  // fiscal, se prefiere no imprimir ninguno.
  telefono: dato('AGENCY_TELEFONO', ''),
  email: dato('AGENCY_EMAIL', 'administracion@vantia.example'),
  web: dato('AGENCY_WEB', 'www.vantia.example'),
  iban: dato('AGENCY_IBAN', 'ES00 0000 0000 0000 0000 0000'),
};

/** Pie legal impreso en todas las facturas. */
export const AGENCY_LEGAL_NOTE =
  'Factura emitida conforme al Real Decreto 1619/2012, por el que se regulan las obligaciones de facturación. ' +
  'Conserve este documento como justificante de la operación.';
