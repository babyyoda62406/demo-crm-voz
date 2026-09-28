import { ValueTransformer } from 'typeorm';

/**
 * El driver de PostgreSQL devuelve las columnas `decimal` como cadena para no
 * perder precisión. Este transformador las expone como `number` en la entidad,
 * que es lo que espera el front (y lo que evita concatenaciones accidentales).
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null): number | null =>
    value === null || value === undefined ? null : value,
  from: (value?: string | number | null): number => {
    if (value === null || value === undefined) return 0;
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
};

/** Redondeo monetario a 2 decimales, estable frente a errores de coma flotante. */
export const redondear = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * ¿Los puntos de la cifra separan millares en lugar de decimales?
 *
 * Con más de un punto siempre agrupan (`1.234.567`). Con uno solo se toman por
 * millares cuando dejan exactamente tres cifras detrás y la parte entera no es
 * cero, de modo que `1.850` sea 1850 (formato español) pero `0.500` siga siendo
 * medio euro.
 */
const puntosAgrupanMillares = (cifra: string): boolean => {
  const partes = cifra.split('.');
  if (partes.length > 2) return true;
  if (partes.length < 2) return false;

  const entero = partes[0].replace('-', '');
  return partes[1].length === 3 && entero !== '' && entero !== '0';
};

/**
 * Normaliza a `number` un importe escrito en español (`1.234,56`) o en
 * anglosajón (`1234.56`). ES EL ÚNICO punto de entrada de importes del módulo:
 * lo usan los DTO al recibir el formulario y la precarga desde contrato, que lee
 * cifras guardadas como texto español dentro del `jsonb` del contrato.
 *
 * Devuelve `undefined` cuando el valor no contiene ninguna cifra reconocible,
 * para que el validador del DTO pueda quejarse con su propio mensaje en vez de
 * colar un 0 silencioso.
 */
export const parsearImporte = (valor?: unknown): number | undefined => {
  if (valor === null || valor === undefined || valor === '') return undefined;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;
  if (typeof valor !== 'string') return undefined;

  // Se queda con la primera cifra del texto: así «2.400€ + IVA» son 2.400 y no
  // un amasijo de dígitos pegados.
  const encontrada = valor.replace(/[\s ]/g, '').match(/-?[.,]?\d[\d.,]*/);
  if (!encontrada) return undefined;

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
      cifra.split(',').length === 2
        ? cifra.replace(',', '.')
        : cifra.split(',').join('');
  } else if (ultimoPunto >= 0) {
    normalizada = puntosAgrupanMillares(cifra) ? cifra.split('.').join('') : cifra;
  } else {
    normalizada = cifra;
  }

  const numero = Number(normalizada);
  return Number.isFinite(numero) ? numero : undefined;
};
