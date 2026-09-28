import {
  diasDesde,
  diasHasta,
  formatearFechaLarga,
  parseMonth,
  parseSpanishDate,
  resolveContractEndDate,
} from './contract-dates.helper';

/**
 * Fechas de vigencia de los contratos.
 *
 * De aqui salen los avisos de prorroga: una fecha mal leida es un contrato que
 * vence sin que nadie se entere, asi que se fija cada formato admitido.
 */

describe('parseMonth', () => {
  it('acepta el numero del mes en base 1', () => {
    expect(parseMonth('1')).toBe(0);
    expect(parseMonth('12')).toBe(11);
    expect(parseMonth('0')).toBeNull();
    expect(parseMonth('13')).toBeNull();
  });

  it('acepta el nombre con o sin tildes y en cualquier caja', () => {
    expect(parseMonth('enero')).toBe(0);
    expect(parseMonth('  DICIEMBRE ')).toBe(11);
  });

  it('acepta las abreviaturas de uso corriente', () => {
    expect(parseMonth('ene')).toBe(0);
    expect(parseMonth('dic')).toBe(11);
    expect(parseMonth('setiembre')).toBe(8);
  });

  it('devuelve null ante lo que no es un mes', () => {
    expect(parseMonth('trimestre')).toBeNull();
    expect(parseMonth('')).toBeNull();
    expect(parseMonth(null)).toBeNull();
  });
});

describe('parseSpanishDate', () => {
  const iso = (fecha: Date | null) =>
    fecha
      ? `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
          fecha.getDate(),
        ).padStart(2, '0')}`
      : null;

  it('lee el formato ISO', () => {
    expect(iso(parseSpanishDate('2026-08-11'))).toBe('2026-08-11');
    expect(iso(parseSpanishDate('2026-08-11T00:00:00.000Z'))).toBe('2026-08-11');
  });

  it('lee el formato de dia primero, que es el que escribe la gente', () => {
    expect(iso(parseSpanishDate('11/08/2026'))).toBe('2026-08-11');
    expect(iso(parseSpanishDate('1-8-2026'))).toBe('2026-08-01');
  });

  it('lee la fecha escrita en letra del encabezado del contrato', () => {
    expect(iso(parseSpanishDate('11 de agosto de 2026'))).toBe('2026-08-11');
  });

  it('las fechas se construyen a mediodia para no bailar con el cambio de hora', () => {
    expect(parseSpanishDate('2026-03-29')?.getHours()).toBe(12);
  });

  it('devuelve null ante un formato que no reconoce', () => {
    expect(parseSpanishDate('agosto de 2026')).toBeNull();
    expect(parseSpanishDate('2026/08/11')).toBeNull();
    expect(parseSpanishDate('')).toBeNull();
  });
});

describe('resolveContractEndDate', () => {
  const dia = (fecha: Date | null) => fecha?.getDate() ?? null;

  it('una prorroga manda sobre la fecha de fin original', () => {
    const fin = resolveContractEndDate({
      fechaFinOriginal: '01/09/2026',
      fechaFinProrroga: '31/12/2026',
    });

    expect(fin?.getMonth()).toBe(11);
    expect(dia(fin)).toBe(31);
  });

  it('recompone la fecha a partir de los campos sueltos de la plantilla', () => {
    const fin = resolveContractEndDate({
      finDia: '15',
      finMes: 'octubre',
      finAnio: '2026',
    });

    expect(fin?.getFullYear()).toBe(2026);
    expect(fin?.getMonth()).toBe(9);
    expect(dia(fin)).toBe(15);
  });

  it('sin datos de vigencia devuelve null en vez de inventarse una fecha', () => {
    expect(resolveContractEndDate({})).toBeNull();
    expect(resolveContractEndDate(null)).toBeNull();
    expect(resolveContractEndDate({ fechaFin: 'cuando toque' })).toBeNull();
  });
});

describe('cuenta de dias', () => {
  const hoy = new Date(2026, 7, 11, 16, 30); // 11/08/2026, media tarde

  it('cuenta dias de calendario, no de 24 horas', () => {
    // A las 16:30 de hoy, «mañana a las 00:05» sigue siendo 1 dia, no 0.
    expect(diasHasta(new Date(2026, 7, 12, 0, 5), hoy)).toBe(1);
    expect(diasHasta(new Date(2026, 7, 11, 23, 59), hoy)).toBe(0);
  });

  it('una fecha ya pasada cuenta en negativo', () => {
    expect(diasHasta(new Date(2026, 7, 1), hoy)).toBe(-10);
  });

  it('diasDesde es la lectura simetrica de diasHasta', () => {
    const fecha = new Date(2026, 6, 12);
    expect(diasDesde(fecha, hoy)).toBe(30);
    expect(diasHasta(fecha, hoy)).toBe(-30);
  });

  it('cruza el cambio de mes y el de año', () => {
    expect(diasHasta(new Date(2026, 8, 10), hoy)).toBe(30);
    expect(diasHasta(new Date(2027, 0, 1), new Date(2026, 11, 31))).toBe(1);
  });
});

describe('formatearFechaLarga', () => {
  it('escribe la fecha como va en el contrato', () => {
    expect(formatearFechaLarga(new Date(2026, 7, 11))).toBe('11 de agosto de 2026');
    expect(formatearFechaLarga(new Date(2026, 0, 1))).toBe('1 de enero de 2026');
  });
});
