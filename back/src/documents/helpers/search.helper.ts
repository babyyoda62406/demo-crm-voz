/**
 * Busqueda del Drive insensible a mayusculas Y a tildes.
 *
 * Nadie teclea «ático» ni «Málaga» en un buscador, y menos desde el movil: si
 * la comparacion no ignora los acentos, media agencia no encuentra sus propios
 * documentos. La normalizacion se hace en los dos lados de la comparacion: el
 * texto que escribe la persona usuaria se limpia en Node y la columna se limpia en SQL.
 *
 * En SQL hay dos caminos segun lo que ofrezca la base de datos:
 *  - `unaccent` (extension de contrib de Postgres): cubre todo el alfabeto
 *    latino y es la via preferente. Se activa en el arranque del modulo.
 *  - `translate`: respaldo sin extensiones ni permisos de superusuario, con las
 *    letras acentuadas del espanol, el catalan y el gallego, que es el universo
 *    real de nombres de este CRM.
 */

/** Letras acentuadas y su equivalente plano. Ambas cadenas van en paralelo. */
const CON_TILDE =
  'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ';
const SIN_TILDE =
  'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC';

/** Quita las tildes de un texto («señorío» → «senorio»). */
export const quitarTildes = (texto: string): string =>
  (texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Expresion SQL que devuelve la columna sin tildes, lista para comparar con
 * `ILIKE` contra un patron ya normalizado con `quitarTildes`.
 */
export const columnaSinTildes = (columna: string, conUnaccent: boolean): string =>
  conUnaccent
    ? `unaccent(${columna})`
    : `translate(${columna}, '${CON_TILDE}', '${SIN_TILDE}')`;
