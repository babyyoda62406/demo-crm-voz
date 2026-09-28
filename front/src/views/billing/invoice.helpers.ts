import type { InvoiceLineDraft } from './invoice.types';

/** Redondeo monetario a 2 decimales (mismo criterio que el backend). */
export const redondear = (valor: number): number => {
  if (!Number.isFinite(valor)) return 0;
  return Math.round((valor + Number.EPSILON) * 100) / 100;
};

/**
 * ¿Los puntos de la cifra separan millares en lugar de decimales?
 *
 * Con más de un punto siempre agrupan (`1.234.567`). Con uno solo se toman por
 * millares cuando dejan exactamente tres cifras detrás y la parte entera no es
 * cero, de modo que `1.850` sea 1850 pero `0.500` siga siendo medio euro.
 */
const puntosAgrupanMillares = (cifra: string): boolean => {
  const partes = cifra.split('.');
  if (partes.length > 2) return true;
  if (partes.length < 2) return false;

  const entero = partes[0].replace('-', '');
  return partes[1].length === 3 && entero !== '' && entero !== '0';
};

/**
 * Normaliza a número un importe escrito en español (`1.234,56`) o en
 * anglosajón (`1234.56`). Único punto de conversión de los campos numéricos de
 * facturación: réplica exacta de `parsearImporte` en
 * `back/src/billing/helpers/money.helper.ts`, para que la previsualización y lo
 * que guarda el servidor no puedan discrepar.
 *
 * Devuelve `null` cuando el texto no contiene ninguna cifra reconocible, para
 * poder distinguir «campo vacío» de «cero».
 */
export const parsearImporte = (valor?: string | number | null): number | null => {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

  // Se queda con la primera cifra del texto: así «2.400€ + IVA» son 2.400.
  const encontrada = valor.replace(/[\s ]/g, '').match(/-?[.,]?\d[\d.,]*/);
  if (!encontrada) return null;

  const cifra = encontrada[0].replace(/[.,]+$/, '');
  const ultimaComa = cifra.lastIndexOf(',');
  const ultimoPunto = cifra.lastIndexOf('.');

  let normalizada: string;
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    // Conviven los dos separadores: el último es el decimal y el otro agrupa.
    const decimal = ultimaComa > ultimoPunto ? ',' : '.';
    const millares = decimal === ',' ? '.' : ',';
    normalizada = cifra.split(millares).join('').replace(decimal, '.');
  } else if (ultimaComa >= 0) {
    // Una coma es el decimal español; varias, separadores de millares.
    normalizada =
      cifra.split(',').length === 2 ? cifra.replace(',', '.') : cifra.split(',').join('');
  } else if (ultimoPunto >= 0) {
    normalizada = puntosAgrupanMillares(cifra) ? cifra.split('.').join('') : cifra;
  } else {
    normalizada = cifra;
  }

  const numero = Number(normalizada);
  return Number.isFinite(numero) ? numero : null;
};

/** Igual que `parsearImporte`, pero con 0 para lo que no es una cifra. */
export const aNumero = (valor: string): number => parsearImporte(valor) ?? 0;

/**
 * Reescribe en es-ES lo que se acaba de teclear, al salir del campo: el importe
 * siempre se ve como se escribe en España (`1.234,56`) y vuelve a leerse igual.
 */
export const formatearImporte = (valor: string, decimales = 2): string => {
  const numero = parsearImporte(valor);
  if (numero === null) return valor.trim();

  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: Math.max(decimales, 2),
    useGrouping: true,
  }).format(numero);
};

/** Formato es-ES de una cantidad, sin forzar decimales (`1`, `2,5`). */
export const formatearCantidad = (valor: string): string => formatearImporte(valor, 0);

/** Importe de una línea en edición. */
export const importeLinea = (linea: InvoiceLineDraft): number =>
  redondear(aNumero(linea.cantidad) * aNumero(linea.precioUnitario));

/**
 * Base imponible, cuota de IVA y total de un borrador de factura. Replica el
 * cálculo del backend para que la previsualización coincida con lo que se
 * guardará.
 */
export const calcularTotales = (
  lineas: InvoiceLineDraft[],
  tipoIva: string,
): { baseImponible: number; cuotaIva: number; total: number } => {
  const baseImponible = redondear(
    lineas.reduce((acumulado, linea) => acumulado + importeLinea(linea), 0),
  );
  const cuotaIva = redondear((baseImponible * aNumero(tipoIva)) / 100);

  return { baseImponible, cuotaIva, total: redondear(baseImponible + cuotaIva) };
};

/** Fecha de hoy en formato `YYYY-MM-DD`, en horario local. */
export const hoyIso = (): string => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

/** Línea vacía para el editor de líneas. */
export const lineaVacia = (): InvoiceLineDraft => ({
  concepto: '',
  cantidad: '1',
  precioUnitario: '',
});
