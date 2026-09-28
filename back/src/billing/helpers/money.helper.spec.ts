import { parsearImporte, redondear } from './money.helper';

/**
 * El fallo que motiva estas pruebas: teclear «1234,56» acababa emitiendo una
 * factura de 123.456,00 € (error de 100×). La normalización tiene que entender
 * los dos formatos con los que la gente escribe importes.
 */
describe('parsearImporte', () => {
  it('entiende el formato español con coma decimal', () => {
    expect(parsearImporte('1234,56')).toBe(1234.56);
    expect(parsearImporte('1.234,56')).toBe(1234.56);
    expect(parsearImporte('1.234.567,89')).toBe(1234567.89);
    expect(parsearImporte('21,5')).toBe(21.5);
    expect(parsearImporte(',56')).toBe(0.56);
  });

  it('entiende el formato anglosajón con punto decimal', () => {
    expect(parsearImporte('1234.56')).toBe(1234.56);
    expect(parsearImporte('1,234.56')).toBe(1234.56);
    expect(parsearImporte('0.50')).toBe(0.5);
    expect(parsearImporte('3500')).toBe(3500);
  });

  it('da el mismo importe escrito en español y en anglosajón', () => {
    expect(parsearImporte('1.234,56')).toBe(parsearImporte('1234.56'));
  });

  it('trata el punto como separador de millares cuando deja tres cifras detrás', () => {
    // Formato en el que los contratos guardan sus cifras dentro del jsonb.
    expect(parsearImporte('1.850')).toBe(1850);
    expect(parsearImporte('0.500')).toBe(0.5);
  });

  it('rescata la cifra de un texto con símbolos', () => {
    expect(parsearImporte('2.400€ + IVA')).toBe(2400);
    expect(parsearImporte('1.750 €')).toBe(1750);
    expect(parsearImporte('21%')).toBe(21);
  });

  it('respeta los números y descarta lo que no es una cifra', () => {
    expect(parsearImporte(1234.56)).toBe(1234.56);
    expect(parsearImporte(-99)).toBe(-99);
    expect(parsearImporte('')).toBeUndefined();
    expect(parsearImporte('   ')).toBeUndefined();
    expect(parsearImporte('sin importe')).toBeUndefined();
    expect(parsearImporte(null)).toBeUndefined();
    expect(parsearImporte(undefined)).toBeUndefined();
    expect(parsearImporte(Number.NaN)).toBeUndefined();
  });
});

describe('redondear', () => {
  it('redondea a céntimo con criterio monetario', () => {
    expect(redondear(3 * 1234.56)).toBe(3703.68);
    expect(redondear(2.5 * 199.99)).toBe(499.98);
    expect(redondear(0.125)).toBe(0.13);
    expect(redondear(Number.NaN)).toBe(0);
  });
});
