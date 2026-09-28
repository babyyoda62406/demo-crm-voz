/**
 * Marca de «datos de demostracion».
 *
 * La semilla anota en la tabla `configs` los identificadores exactos de todo lo
 * que ha escrito. Con esa lista, retirar la demostracion deja de ser un ejercicio
 * de adivinacion («¿este cliente es de verdad o es de la demo?») y pasa a ser
 * una operacion exacta: se borra lo anotado y nada mas.
 *
 * Se guarda en `configs` a proposito, en vez de anadir una columna `esDemo` a
 * media docena de tablas de otros dominios: no toca el esquema de nadie y
 * sobrevive a los cambios de esas entidades.
 */

/** Clave de la fila de `configs` que guarda el inventario de la demostracion. */
export const DEMO_DATASET_KEY = 'demo.dataset';

/** Descripcion legible de la fila, para quien la encuentre en la tabla. */
export const DEMO_DATASET_DESCRIPTION =
  'Inventario de los registros creados por la semilla de demostración. Permite retirar la demo sin tocar los datos reales.';

/**
 * Version del formato del inventario. Si algun dia cambia la forma del JSON,
 * esto permite distinguir una marca antigua de una nueva sin romperse.
 */
export const DEMO_DATASET_VERSION = 1;

/** Inventario de lo que ha escrito la semilla, por tabla. */
export interface IDemoDataset {
  /** Version del formato de esta marca. */
  version: number;
  /** Momento en el que se sembro, en ISO 8601. */
  sembradoAt: string;
  clientes: number[];
  propiedades: number[];
  contratos: number[];
  facturas: number[];
  notificaciones: number[];
}

/** Inventario vacio, con el que arrancar antes de sembrar. */
export function datasetVacio(): IDemoDataset {
  return {
    version: DEMO_DATASET_VERSION,
    sembradoAt: new Date().toISOString(),
    clientes: [],
    propiedades: [],
    contratos: [],
    facturas: [],
    notificaciones: [],
  };
}

/**
 * Lee un inventario guardado, tolerando basura.
 *
 * La fila de `configs` la puede haber tocado una persona, asi que se valida en
 * vez de confiar: un JSON roto devuelve `null` y quien llama decide, en lugar de
 * reventar en mitad de un borrado.
 *
 * @param crudo Contenido del campo `value` de la fila.
 * @returns El inventario, o `null` si no se puede interpretar.
 */
export function leerDataset(crudo: string | null | undefined): IDemoDataset | null {
  if (!crudo) return null;

  try {
    const datos = JSON.parse(crudo) as Partial<IDemoDataset>;
    const lista = (valor: unknown): number[] =>
      Array.isArray(valor)
        ? valor.map(Number).filter((id) => Number.isInteger(id) && id > 0)
        : [];

    return {
      version: Number(datos.version) || DEMO_DATASET_VERSION,
      sembradoAt: String(datos.sembradoAt ?? ''),
      clientes: lista(datos.clientes),
      propiedades: lista(datos.propiedades),
      contratos: lista(datos.contratos),
      facturas: lista(datos.facturas),
      notificaciones: lista(datos.notificaciones),
    };
  } catch {
    return null;
  }
}
