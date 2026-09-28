import {
  formatearImporte,
  importeALetras,
  numeroALetras,
  parseImporte,
} from './number-to-words.helper';

/**
 * Importes en letras y en cifra dentro de los contratos.
 *
 * En un contrato de arrendamiento la renta va escrita dos veces —en numero y en
 * letra— y si no coinciden el documento es discutible. Esto fija la conversion.
 */

describe('numeroALetras', () => {
  it('cubre los casos que el castellano escribe distinto', () => {
    expect(numeroALetras(0)).toBe('CERO');
    expect(numeroALetras(1)).toBe('UNO');
    expect(numeroALetras(15)).toBe('QUINCE');
    expect(numeroALetras(21)).toBe('VEINTIUNO');
    expect(numeroALetras(22)).toBe('VEINTIDÓS');
    expect(numeroALetras(31)).toBe('TREINTA Y UNO');
    expect(numeroALetras(100)).toBe('CIEN');
    expect(numeroALetras(101)).toBe('CIENTO UNO');
    expect(numeroALetras(200)).toBe('DOSCIENTOS');
    expect(numeroALetras(500)).toBe('QUINIENTOS');
    expect(numeroALetras(700)).toBe('SETECIENTOS');
    expect(numeroALetras(900)).toBe('NOVECIENTOS');
  });

  it('distingue el singular del plural en mil y millon', () => {
    expect(numeroALetras(1000)).toBe('MIL');
    expect(numeroALetras(2000)).toBe('DOS MIL');
    expect(numeroALetras(1_000_000)).toBe('UN MILLÓN');
    expect(numeroALetras(2_000_000)).toBe('DOS MILLONES');
  });

  it('las rentas y honorarios habituales salen bien', () => {
    expect(numeroALetras(1150)).toBe('MIL CIENTO CINCUENTA');
    expect(numeroALetras(318000)).toBe('TRESCIENTOS DIECIOCHO MIL');
  });
});

describe('importeALetras', () => {
  it('añade la moneda y respeta la preposicion de los millones', () => {
    expect(importeALetras(1200)).toBe('MIL DOSCIENTOS EUROS');
    // «un millón DE euros», pero «un millón doscientos mil euros».
    expect(importeALetras(1_000_000)).toBe('UN MILLÓN DE EUROS');
    expect(importeALetras(1_200_000)).toBe('UN MILLÓN DOSCIENTOS MIL EUROS');
  });

  it('escribe los centimos cuando los hay', () => {
    expect(importeALetras(1150.5)).toBe('MIL CIENTO CINCUENTA EUROS CON CINCUENTA CÉNTIMOS');
    expect(importeALetras(1150)).not.toContain('CÉNTIMOS');
  });

  it('entiende el importe escrito como lo teclea una persona', () => {
    expect(importeALetras('1.150')).toBe('MIL CIENTO CINCUENTA EUROS');
    expect(importeALetras('1.150,50 €')).toBe(
      'MIL CIENTO CINCUENTA EUROS CON CINCUENTA CÉNTIMOS',
    );
  });

  it('ante un valor ilegible devuelve cadena vacia y no «NaN EUROS»', () => {
    expect(importeALetras('a convenir')).toBe('');
    expect(importeALetras(null)).toBe('');
    expect(importeALetras(undefined)).toBe('');
  });
});

describe('parseImporte', () => {
  it('quita simbolos, puntos de millar y admite la coma decimal', () => {
    expect(parseImporte('1.234,56 €')).toBe(1234.56);
    expect(parseImporte('  950  ')).toBe(950);
    expect(parseImporte(1234.56)).toBe(1234.56);
  });

  it('devuelve null en lugar de cero cuando no hay importe', () => {
    expect(parseImporte('')).toBeNull();
    expect(parseImporte('a convenir')).toBeNull();
    expect(parseImporte(Infinity)).toBeNull();
  });
});

describe('formatearImporte', () => {
  it('escribe el importe como se lee en España', () => {
    expect(formatearImporte(1200)).toBe('1.200');
    expect(formatearImporte(1200.5)).toBe('1.200,50');
    expect(formatearImporte('318000')).toBe('318.000');
  });

  it('un texto que no es un importe se deja tal cual', () => {
    // El contrato puede decir «a convenir» donde iria una cifra; reescribirlo
    // como 0 seria peor que dejarlo escrito.
    expect(formatearImporte('a convenir')).toBe('a convenir');
  });
});
