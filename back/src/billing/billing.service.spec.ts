import { HttpStatus } from '@nestjs/common';
import { BillingService } from './billing.service';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { Invoice } from './entities/invoice.entity';
import { InvoiceSequence } from './entities/invoice-sequence.entity';

/**
 * Facturacion: calculo de importes, correlativo y maquina de estados.
 *
 * El servicio solo necesita tres colaboradores y ninguno toca la red, asi que
 * se construye a mano con dobles en lugar de levantar un modulo de Nest.
 */

type Doble = {
  servicio: BillingService;
  invoiceDAO: { save: jest.Mock; findOne: jest.Mock };
  manager: {
    query: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
};

const construir = (): Doble => {
  const invoiceDAO = { save: jest.fn(), findOne: jest.fn() };

  const manager = {
    query: jest.fn().mockResolvedValue(undefined),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((_entidad: unknown, datos: unknown) => ({ ...(datos as object) })),
    save: jest.fn(async (_entidad: unknown, fila: unknown) => fila),
  };

  const dataSource = {
    transaction: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
  };

  const invoicePdfService = { generate: jest.fn(), buildFileName: jest.fn() };

  const servicio = new BillingService(
    invoiceDAO as never,
    dataSource as never,
    invoicePdfService as never,
  );

  return { servicio, invoiceDAO, manager };
};

/** Acceso a los metodos privados de calculo, que son funciones puras. */
const interno = (servicio: BillingService) =>
  servicio as unknown as {
    calcularLineas: (lineas: unknown[]) => {
      concepto: string;
      cantidad: number;
      precioUnitario: number;
      importe: number;
    }[];
    calcularImportes: (
      lineas: unknown[],
      tipoIva: number,
    ) => { baseImponible: number; cuotaIva: number; total: number };
    normalizarTipoIva: (tipoIva?: number) => number;
    agregarResumen: (facturas: unknown[]) => Record<string, number>;
    reservarNumero: (
      manager: unknown,
      fechaEmision: string,
    ) => Promise<{ numero: string; ejercicio: number; secuencia: number }>;
  };

const factura = (parcial: Partial<Invoice>): Invoice =>
  ({
    id: 1,
    numero: 'FRA-2026-0001',
    ejercicio: 2026,
    estado: InvoiceStatus.EMITIDA,
    fechaEmision: '2026-03-10',
    fechaCobro: null,
    baseImponible: 0,
    cuotaIva: 0,
    total: 0,
    ...parcial,
  }) as Invoice;

describe('calculo de la factura', () => {
  it('multiplica cantidad por precio y redondea a centimo', () => {
    const { servicio } = construir();

    expect(
      interno(servicio).calcularLineas([
        { concepto: '  Honorarios PSI  ', cantidad: 3, precioUnitario: 1234.56 },
      ]),
    ).toEqual([
      {
        concepto: 'Honorarios PSI',
        cantidad: 3,
        precioUnitario: 1234.56,
        importe: 3703.68,
      },
    ]);
  });

  it('trata como cero lo que no es un numero, en vez de propagar NaN', () => {
    const { servicio } = construir();

    const [linea] = interno(servicio).calcularLineas([
      { concepto: 'Suplido', cantidad: 'dos', precioUnitario: null },
    ]);

    expect(linea.cantidad).toBe(0);
    expect(linea.precioUnitario).toBe(0);
    expect(linea.importe).toBe(0);
  });

  it('suma la base, aplica el IVA y cuadra el total', () => {
    const { servicio } = construir();

    expect(
      interno(servicio).calcularImportes(
        [{ importe: 950 }, { importe: 170 }],
        21,
      ),
    ).toEqual({ baseImponible: 1120, cuotaIva: 235.2, total: 1355.2 });
  });

  it('un IVA del 0 % es valido y no se confunde con «sin indicar»', () => {
    const { servicio } = construir();

    expect(interno(servicio).normalizarTipoIva(0)).toBe(0);
    expect(interno(servicio).calcularImportes([{ importe: 500 }], 0)).toEqual({
      baseImponible: 500,
      cuotaIva: 0,
      total: 500,
    });
  });

  it('sin tipo de IVA, o con basura, aplica el 21 % general', () => {
    const { servicio } = construir();

    expect(interno(servicio).normalizarTipoIva(undefined)).toBe(21);
    expect(interno(servicio).normalizarTipoIva(Number('x'))).toBe(21);
    expect(interno(servicio).normalizarTipoIva(10.5)).toBe(10.5);
  });

  it('el precio unitario se redondea a centimo ANTES de multiplicar', () => {
    const { servicio } = construir();

    // 33,333 no es un precio facturable: se guarda 33,33 y la linea sale de ahi.
    // Multiplicar primero daria 99,999 -> 100,00, un centimo que no aparece en
    // ninguna linea del PDF y que descuadraria la base contra el detalle.
    const lineas = interno(servicio).calcularLineas([
      { concepto: 'A', cantidad: 3, precioUnitario: 33.333 },
      { concepto: 'B', cantidad: 3, precioUnitario: 33.333 },
    ]);
    const importes = interno(servicio).calcularImportes(lineas, 21);

    expect(lineas.map((l) => l.precioUnitario)).toEqual([33.33, 33.33]);
    expect(lineas.map((l) => l.importe)).toEqual([99.99, 99.99]);
    expect(importes).toEqual({
      baseImponible: 199.98,
      cuotaIva: 42,
      total: 241.98,
    });
  });
});

describe('resumen de un periodo', () => {
  it('una factura anulada conserva su numero pero sale de los totales', () => {
    const { servicio } = construir();

    const resumen = interno(servicio).agregarResumen([
      factura({
        estado: InvoiceStatus.COBRADA,
        baseImponible: 1000,
        cuotaIva: 210,
        total: 1210,
      }),
      factura({
        estado: InvoiceStatus.EMITIDA,
        baseImponible: 500,
        cuotaIva: 105,
        total: 605,
      }),
      factura({
        estado: InvoiceStatus.ANULADA,
        baseImponible: 300,
        cuotaIva: 63,
        total: 363,
      }),
    ]);

    // Las tres se cuentan, pero la anulada solo suma en `totalAnulado`.
    expect(resumen.numeroFacturas).toBe(3);
    expect(resumen.baseImponible).toBe(1500);
    expect(resumen.cuotaIva).toBe(315);
    expect(resumen.total).toBe(1815);
    expect(resumen.totalCobrado).toBe(1210);
    expect(resumen.totalPendiente).toBe(605);
    expect(resumen.totalAnulado).toBe(363);
  });

  it('sin facturas devuelve ceros, nunca NaN', () => {
    const { servicio } = construir();
    const resumen = interno(servicio).agregarResumen([]);

    for (const valor of Object.values(resumen)) {
      expect(valor).toBe(0);
    }
  });
});

describe('correlativo FRA-AAAA-NNNN', () => {
  it('arranca en 0001 el primer ejercicio y toma el bloqueo del año', async () => {
    const { servicio, manager } = construir();

    const reserva = await interno(servicio).reservarNumero(manager, '2026-03-10');

    expect(reserva).toEqual({
      numero: 'FRA-2026-0001',
      ejercicio: 2026,
      secuencia: 1,
    });
    // El bloqueo es por ejercicio: dos años distintos numeran en paralelo.
    expect(manager.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [expect.any(Number), 2026],
    );
  });

  it('continua el contador guardado del ejercicio', async () => {
    const { servicio, manager } = construir();
    manager.findOne.mockResolvedValue({ ejercicio: 2026, ultimoNumero: 41 });

    const reserva = await interno(servicio).reservarNumero(manager, '2026-12-31');

    expect(reserva.numero).toBe('FRA-2026-0042');
    expect(manager.save).toHaveBeenCalledWith(
      InvoiceSequence,
      expect.objectContaining({ ultimoNumero: 42 }),
    );
  });

  it('el ejercicio sale de la fecha de emision, no del reloj', async () => {
    const { servicio, manager } = construir();

    const reserva = await interno(servicio).reservarNumero(manager, '2025-01-02');

    expect(reserva.ejercicio).toBe(2025);
    expect(reserva.numero).toBe('FRA-2025-0001');
  });

  it('pasada la factura 9999 el numero crece en vez de truncarse', async () => {
    const { servicio, manager } = construir();
    manager.findOne.mockResolvedValue({ ejercicio: 2026, ultimoNumero: 9999 });

    const reserva = await interno(servicio).reservarNumero(manager, '2026-06-01');

    expect(reserva.numero).toBe('FRA-2026-10000');
  });
});

describe('maquina de estados de la factura', () => {
  const capturar = async (accion: Promise<unknown>) => {
    try {
      await accion;
      throw new Error('se esperaba una excepcion y no la hubo');
    } catch (error) {
      return error as { getStatus?: () => number; getResponse?: () => unknown };
    }
  };

  it('marcar como cobrada fija la fecha y cambia el estado', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(factura({}));
    invoiceDAO.save.mockImplementation(async (f: Invoice) => f);

    const cobrada = await servicio.markAsPaid(1, { fechaCobro: '2026-03-20' });

    expect(cobrada.estado).toBe(InvoiceStatus.COBRADA);
    expect(cobrada.fechaCobro).toBe('2026-03-20');
  });

  it('no se cobra dos veces la misma factura', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(
      factura({ estado: InvoiceStatus.COBRADA, fechaCobro: '2026-03-20' }),
    );

    const error = await capturar(servicio.markAsPaid(1));

    expect(error.getStatus?.()).toBe(HttpStatus.CONFLICT);
  });

  it('una factura anulada ya no se puede cobrar', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(
      factura({ estado: InvoiceStatus.ANULADA }),
    );

    const error = await capturar(servicio.markAsPaid(1));

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });

  it('el cobro no puede ser anterior a la emision', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(factura({ fechaEmision: '2026-03-10' }));

    const error = await capturar(
      servicio.markAsPaid(1, { fechaCobro: '2026-03-09' }),
    );

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });

  it('deshacer el cobro devuelve la factura a emitida y borra la fecha', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(
      factura({ estado: InvoiceStatus.COBRADA, fechaCobro: '2026-03-20' }),
    );
    invoiceDAO.save.mockImplementation(async (f: Invoice) => f);

    const pendiente = await servicio.revertPayment(1);

    expect(pendiente.estado).toBe(InvoiceStatus.EMITIDA);
    expect(pendiente.fechaCobro).toBeNull();
  });

  it('solo se deshace el cobro de una factura cobrada', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(factura({}));

    const error = await capturar(servicio.revertPayment(1));

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });

  it('anular conserva el numero y no se repite', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(
      factura({ estado: InvoiceStatus.COBRADA, fechaCobro: '2026-03-20' }),
    );
    invoiceDAO.save.mockImplementation(async (f: Invoice) => f);

    const anulada = await servicio.cancel(1);
    expect(anulada.estado).toBe(InvoiceStatus.ANULADA);
    expect(anulada.numero).toBe('FRA-2026-0001');
    expect(anulada.fechaCobro).toBeNull();

    invoiceDAO.findOne.mockResolvedValue(anulada);
    const error = await capturar(servicio.cancel(1));
    expect(error.getStatus?.()).toBe(HttpStatus.CONFLICT);
  });

  it('una factura emitida NO se borra: se anula', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(factura({}));

    const error = await capturar(servicio.remove(1));

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
    expect(invoiceDAO.save).not.toHaveBeenCalled();
  });

  it('el importe de una factura emitida es inmutable', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(factura({}));

    const porLineas = await capturar(
      servicio.update(1, {
        lineas: [{ concepto: 'x', cantidad: 1, precioUnitario: 10 }],
      } as never),
    );
    const porIva = await capturar(servicio.update(1, { tipoIva: 10 } as never));

    expect(porLineas.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
    expect(porIva.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });

  it('una factura cobrada ya no admite cambios de datos', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(
      factura({ estado: InvoiceStatus.COBRADA }),
    );

    const error = await capturar(servicio.update(1, { notas: 'otra cosa' }));

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });

  it('cambiar la fecha de emision no puede sacarla de su ejercicio', async () => {
    const { servicio, invoiceDAO } = construir();
    invoiceDAO.findOne.mockResolvedValue(factura({ ejercicio: 2026 }));

    const error = await capturar(
      servicio.update(1, { fechaEmision: '2025-12-31' }),
    );

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });
});
