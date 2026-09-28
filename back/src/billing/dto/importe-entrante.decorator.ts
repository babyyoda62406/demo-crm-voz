import { Transform } from 'class-transformer';
import { parsearImporte } from '../helpers/money.helper';

/**
 * Normaliza un importe recibido en el cuerpo de la petición admitiendo el
 * formato español (`1.234,56`) y el anglosajón (`1234.56`).
 *
 * Sustituye a `@Type(() => Number)` en los campos de dinero: se lee el valor del
 * objeto original (`obj[key]`) y no el ya convertido, porque la conversión
 * implícita de class-transformer convierte «1.234,56» en `NaN` antes de llegar
 * aquí. Si la cifra no se reconoce se devuelve el valor tal cual, para que el
 * validador responda con su propio mensaje en vez de colar un 0 silencioso.
 */
export const ImporteEntrante = (): PropertyDecorator =>
  Transform(({ obj, key, value }) => parsearImporte(obj?.[key]) ?? value);
