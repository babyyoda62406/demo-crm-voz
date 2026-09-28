/**
 * Conversion de importes a letras en espanol, para los huecos del tipo
 * «la cantidad de MIL DOSCIENTOS EUROS (1.200€)» de los contratos.
 */

const UNIDADES = [
  '',
  'UNO',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISÉIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
  'VEINTE',
];

const DECENAS = [
  '',
  '',
  'VEINTI',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

/** Convierte un entero menor de 1000 a letras. */
function centenasALetras(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];

  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto <= 20) {
      partes.push(UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      if (d === 2) {
        // «veintidós», «veintitrés» y «veintiséis» llevan tilde.
        const veintis: Record<number, string> = {
          2: 'VEINTIDÓS',
          3: 'VEINTITRÉS',
          6: 'VEINTISÉIS',
        };
        partes.push(
          u === 0 ? 'VEINTE' : (veintis[u] ?? `${DECENAS[2]}${UNIDADES[u]}`),
        );
      } else if (u === 0) {
        partes.push(DECENAS[d]);
      } else {
        partes.push(`${DECENAS[d]} Y ${UNIDADES[u]}`);
      }
    }
  }

  return partes.join(' ').trim();
}

/**
 * Convierte un numero entero a letras (mayusculas, sin acentos).
 * Soporta hasta 999.999.999, mas que suficiente para importes de contrato.
 */
export function numeroALetras(valor: number): string {
  const entero = Math.floor(Math.abs(valor));
  if (entero === 0) return 'CERO';

  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1000);
  const resto = entero % 1000;
  const partes: string[] = [];

  if (millones === 1) partes.push('UN MILLÓN');
  else if (millones > 1) partes.push(`${centenasALetras(millones)} MILLONES`);

  if (miles === 1) partes.push('MIL');
  else if (miles > 1) partes.push(`${centenasALetras(miles)} MIL`);

  if (resto > 0) partes.push(centenasALetras(resto));

  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normaliza un importe escrito por la persona usuaria («1.200,50», «1200.5», «1.200 €»)
 * y devuelve el numero. Devuelve `null` si no se puede interpretar.
 */
export function parseImporte(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor !== 'string') return null;

  const limpio = valor
    .replace(/[€\s]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');

  const numero = Number(limpio);
  return Number.isFinite(numero) && limpio !== '' ? numero : null;
}

/**
 * Devuelve el importe en letras seguido de «EUROS», con los centimos si los hay.
 * @example importeALetras('1.200') -> 'MIL DOSCIENTOS EUROS'
 */
export function importeALetras(valor: unknown): string {
  const numero = parseImporte(valor);
  if (numero === null) return '';

  const entero = Math.floor(numero);
  const centimos = Math.round((numero - entero) * 100);
  const letras = numeroALetras(entero);

  // «un millón DE euros», pero «un millón doscientos mil euros».
  const nexo = /MILL(ÓN|ONES)$/.test(letras) ? ' DE EUROS' : ' EUROS';
  const base = `${letras}${nexo}`;

  return centimos > 0
    ? `${base} CON ${numeroALetras(centimos)} CÉNTIMOS`
    : base;
}

/** Formatea un importe con separador de miles espanol (1200 -> «1.200»). */
export function formatearImporte(valor: unknown): string {
  const numero = parseImporte(valor);
  if (numero === null) return typeof valor === 'string' ? valor : '';
  // `useGrouping: true` fuerza el separador de miles tambien en cifras de
  // cuatro digitos («1.200»), que es como aparecen los importes en los contratos.
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(numero);
}
