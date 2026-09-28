/**
 * Ciclo de vida del contrato: envio, apertura del enlace, firma y guardas.
 *
 * `contracts.service.ts` lee la configuracion al construirse, asi que el modulo
 * de entorno se sustituye por un doble antes de importarlo. Asi el test no
 * depende de que haya un `.env` en la maquina que lo ejecute.
 */
jest.mock('../env/envs', () => ({
  getEnvConfig: () => ({
    URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:5173',
    UPLOADS_DIR: './uploads',
    GOTENBERG_URL: 'http://localhost:3001',
    ENABLE_WEBHOOK_LOGS: false,
    WEBHOOK_URL: '',
  }),
}));

import { HttpStatus } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractState } from './enums/contract-state.enum';
import { ContractFieldType } from './enums/contract-field-type.enum';
import { Contract } from './entities/contract.entity';
import { ContractTemplate } from './entities/contract-template.entity';
import { ContractStatus } from '../common/contracts/assistant-actions';

const contrato = (parcial: Partial<Contract> = {}): Contract =>
  ({
    id: 7,
    referencia: 'CT-2026-0007',
    titulo: 'Alquiler temporal',
    templateKey: 'alquiler-temporal',
    estado: ContractState.BORRADOR,
    datos: {},
    publicToken: null,
    destinatarioEmail: null,
    enviadoAt: null,
    vistoAt: null,
    firmadoAt: null,
    firmanteNombre: null,
    firmanteIp: null,
    docxPath: null,
    pdfPath: null,
    ...parcial,
  }) as Contract;

type Dobles = {
  servicio: ContractsService;
  contractDAO: {
    findOne: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
};

const construir = (): Dobles => {
  const contractDAO = {
    findOne: jest.fn(),
    save: jest.fn(async (c: Contract) => c),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const clientDAO = { findOne: jest.fn() };
  const templatesService = { findByKey: jest.fn() };
  const pdfConverter = { isConfigured: false, docxToPdf: jest.fn() };

  const servicio = new ContractsService(
    contractDAO as never,
    clientDAO as never,
    templatesService as never,
    pdfConverter as never,
  );

  // La notificacion sale por webhook y no es lo que se esta probando aqui.
  (servicio as unknown as { notificar: () => Promise<void> }).notificar = jest
    .fn()
    .mockResolvedValue(undefined);

  return { servicio, contractDAO };
};

const interno = (servicio: ContractsService) =>
  servicio as unknown as {
    prepararDatos: (
      plantilla: ContractTemplate,
      entrada: Record<string, unknown>,
    ) => Record<string, unknown>;
    validarObligatorios: (
      plantilla: ContractTemplate,
      datos: Record<string, unknown>,
    ) => void;
    generarReferencia: () => Promise<string>;
    generarTitulo: (
      plantilla: ContractTemplate,
      datos: Record<string, unknown>,
      dto: Record<string, unknown>,
    ) => string;
  };

const capturar = async (accion: Promise<unknown>) => {
  try {
    await accion;
    throw new Error('se esperaba una excepcion y no la hubo');
  } catch (error) {
    return error as { getStatus?: () => number };
  }
};

describe('ciclo de firma del contrato', () => {
  it('enviar acuña el enlace publico, pasa a ENVIADO y limpia la traza de apertura', async () => {
    const { servicio, contractDAO } = construir();
    const borrador = contrato({ vistoAt: new Date('2026-01-01') });
    contractDAO.findOne.mockResolvedValue(borrador);

    const resultado = await servicio.enviar(7, {
      destinatarioEmail: 'firmante@example.com',
    });

    expect(resultado.contrato.estado).toBe(ContractState.ENVIADO);
    expect(resultado.contrato.publicToken).toMatch(/^[0-9a-f]{48}$/);
    expect(resultado.contrato.enviadoAt).toBeInstanceOf(Date);
    // Reenviar tiene que volver a pedir la apertura: si `vistoAt` sobreviviera,
    // el panel diria que el cliente ya lo ha abierto sin haberlo hecho.
    expect(resultado.contrato.vistoAt).toBeNull();
    expect(resultado.contrato.destinatarioEmail).toBe('firmante@example.com');
    expect(resultado.enlacePublico).toBe(
      `http://localhost:3000/api/contracts/public/${borrador.publicToken}`,
    );
  });

  it('reenviar conserva el token para no invalidar el enlace ya repartido', async () => {
    const { servicio, contractDAO } = construir();
    const enviado = contrato({
      estado: ContractState.ENVIADO,
      publicToken: 'token-ya-repartido',
    });
    contractDAO.findOne.mockResolvedValue(enviado);

    const resultado = await servicio.enviar(7, {});

    expect(resultado.contrato.publicToken).toBe('token-ya-repartido');
  });

  it('un contrato firmado ya no se vuelve a enviar', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.FIRMADO }),
    );

    const error = await capturar(servicio.enviar(7, {}));

    expect(error.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
  });

  it('abrir el enlace mueve ENVIADO -> VISTO y deja la fecha de apertura', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.ENVIADO, publicToken: 'abc' }),
    );

    const visto = await servicio.findByPublicToken('abc');

    expect(visto.estado).toBe(ContractState.VISTO);
    expect(visto.vistoAt).toBeInstanceOf(Date);
    expect(contractDAO.save).toHaveBeenCalledTimes(1);
  });

  it('abrir el enlace por segunda vez no reescribe la fecha de apertura', async () => {
    const { servicio, contractDAO } = construir();
    const primeraApertura = new Date('2026-02-01T10:00:00Z');
    contractDAO.findOne.mockResolvedValue(
      contrato({
        estado: ContractState.VISTO,
        publicToken: 'abc',
        vistoAt: primeraApertura,
      }),
    );

    const visto = await servicio.findByPublicToken('abc');

    expect(visto.vistoAt).toBe(primeraApertura);
    expect(contractDAO.save).not.toHaveBeenCalled();
  });

  it('un enlace anulado ya no abre nada', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.ANULADO, publicToken: 'abc' }),
    );

    const error = await capturar(servicio.findByPublicToken('abc'));

    expect(error.getStatus?.()).toBe(HttpStatus.NOT_FOUND);
  });

  it('un token inexistente responde lo mismo que uno anulado', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(null);

    const error = await capturar(servicio.findByPublicToken('no-existe'));

    expect(error.getStatus?.()).toBe(HttpStatus.NOT_FOUND);
  });

  it('firmar registra nombre, IP y fecha, y pasa a FIRMADO', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.ENVIADO, publicToken: 'abc' }),
    );

    const firmado = await servicio.firmarPorToken(
      'abc',
      { firmanteNombre: '  Tomás Olivares Rey  ' },
      '203.0.113.10',
    );

    expect(firmado.estado).toBe(ContractState.FIRMADO);
    expect(firmado.firmanteNombre).toBe('Tomás Olivares Rey');
    expect(firmado.firmanteIp).toBe('203.0.113.10');
    expect(firmado.firmadoAt).toBeInstanceOf(Date);
  });

  it('no se firma dos veces el mismo contrato', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.FIRMADO, publicToken: 'abc' }),
    );

    const error = await capturar(
      servicio.firmarPorToken('abc', { firmanteNombre: 'Otro' }),
    );

    expect(error.getStatus?.()).toBe(HttpStatus.CONFLICT);
  });

  it('un contrato firmado no se modifica ni se borra', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.FIRMADO }),
    );

    const alEditar = await capturar(servicio.update(7, { titulo: 'otro' }));
    const alBorrar = await capturar(servicio.remove(7));

    expect(alEditar.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
    expect(alBorrar.getStatus?.()).toBe(HttpStatus.PRECONDITION_FAILED);
    expect(contractDAO.delete).not.toHaveBeenCalled();
  });

  it('anular desactiva el enlace publico', async () => {
    const { servicio, contractDAO } = construir();
    contractDAO.findOne.mockResolvedValue(
      contrato({ estado: ContractState.ENVIADO, publicToken: 'abc' }),
    );

    const anulado = await servicio.anular(7);

    expect(anulado.estado).toBe(ContractState.ANULADO);
    expect(anulado.publicToken).toBeNull();
  });
});

describe('consulta por estado desde el asistente', () => {
  it('«pendiente de firma» agrupa enviados y vistos', async () => {
    const { servicio, contractDAO } = construir();
    const find = jest.fn().mockResolvedValue([]);
    (contractDAO as unknown as { find: jest.Mock }).find = find;

    await servicio.getContractsByStatus(ContractStatus.PENDIENTE_FIRMA);

    const donde = find.mock.calls[0][0].where.estado;
    expect(donde._value).toEqual([ContractState.ENVIADO, ContractState.VISTO]);
  });

  it('un estado del que no se hace seguimiento responde ok con lista vacia', async () => {
    const { servicio } = construir();

    const resultado = await servicio.getContractsByStatus(
      ContractStatus.VENCIDO,
    );

    // Devolver `ok: false` haria que el asistente dijera que ha fallado algo,
    // cuando lo cierto es que ese estado no se sigue en el CRM.
    expect(resultado.ok).toBe(true);
    expect(resultado.data).toEqual([]);
  });
});

describe('correlativo CT-AAAA-NNNN', () => {
  const conCuenta = (dobles: Dobles, total: number) => {
    dobles.contractDAO.createQueryBuilder.mockReturnValue({
      where: () => ({ getCount: async () => total }),
    });
  };

  it('numera a partir de los contratos que ya existen del año', async () => {
    const dobles = construir();
    conCuenta(dobles, 6);
    dobles.contractDAO.findOne.mockResolvedValue(null);

    const anio = new Date().getFullYear();
    await expect(interno(dobles.servicio).generarReferencia()).resolves.toBe(
      `CT-${anio}-0007`,
    );
  });

  it('salta las referencias ya ocupadas por huecos de borrados', async () => {
    const dobles = construir();
    conCuenta(dobles, 2);
    // CT-....-0003 y CT-....-0004 existen; la primera libre es la 0005.
    dobles.contractDAO.findOne
      .mockResolvedValueOnce(contrato({}))
      .mockResolvedValueOnce(contrato({}))
      .mockResolvedValue(null);

    const anio = new Date().getFullYear();
    await expect(interno(dobles.servicio).generarReferencia()).resolves.toBe(
      `CT-${anio}-0005`,
    );
  });
});

describe('preparacion de los datos de la plantilla', () => {
  const plantilla = {
    key: 'demo',
    nombre: 'Contrato de demostración',
    campos: [
      { name: 'arrendadorNombre', label: 'Arrendador', type: ContractFieldType.TEXTO, required: true },
      { name: 'diaPago', label: 'Día de pago', type: ContractFieldType.TEXTO, defaultValue: '5' },
      { name: 'precioMensualCifra', label: 'Renta', type: ContractFieldType.MONEDA },
      {
        name: 'precioMensualLetras',
        label: 'Renta en letras',
        type: ContractFieldType.TEXTO,
        derivedFromAmount: 'precioMensualCifra',
      },
      {
        name: 'ocupantes',
        label: 'Ocupantes',
        type: ContractFieldType.LISTA,
        maxRows: 2,
        subFields: [
          { name: 'nombre', label: 'Nombre', type: ContractFieldType.TEXTO },
          { name: 'dni', label: 'DNI', type: ContractFieldType.DOCUMENTO },
        ],
      },
    ],
  } as unknown as ContractTemplate;

  it('aplica el valor por defecto cuando el campo llega vacio', () => {
    const { servicio } = construir();

    const datos = interno(servicio).prepararDatos(plantilla, {
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
      diaPago: '',
    });

    expect(datos.diaPago).toBe('5');
  });

  it('formatea los importes y deriva su version en letras', () => {
    const { servicio } = construir();

    const datos = interno(servicio).prepararDatos(plantilla, {
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
      precioMensualCifra: 1150,
    });

    expect(datos.precioMensualCifra).toBe('1.150');
    expect(datos.precioMensualLetras).toBe('MIL CIENTO CINCUENTA EUROS');
  });

  it('un campo sin valor se renderiza vacio, nunca como «undefined»', () => {
    const { servicio } = construir();

    const datos = interno(servicio).prepararDatos(plantilla, {
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
    });

    expect(datos.precioMensualCifra).toBe('');
    expect(String(datos.precioMensualLetras)).not.toContain('undefined');
  });

  it('descarta las filas de una lista que vienen enteras en blanco', () => {
    const { servicio } = construir();

    const datos = interno(servicio).prepararDatos(plantilla, {
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
      ocupantes: [
        { nombre: 'Ana Pérez', dni: '00000001R' },
        { nombre: '   ', dni: '' },
      ],
    });

    expect(datos.ocupantes).toEqual([{ nombre: 'Ana Pérez', dni: '00000001R' }]);
  });

  it('un campo obligatorio en blanco corta la generacion nombrando su etiqueta', async () => {
    const { servicio } = construir();

    const error = await capturar(
      Promise.resolve().then(() =>
        interno(servicio).validarObligatorios(plantilla, {
          arrendadorNombre: '   ',
        }),
      ),
    );

    expect(error.getStatus?.()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('se respeta el maximo de filas que declara la plantilla', async () => {
    const { servicio } = construir();

    const error = await capturar(
      Promise.resolve().then(() =>
        interno(servicio).validarObligatorios(plantilla, {
          arrendadorNombre: 'Vantia Patrimonio, S.L.',
          ocupantes: [{ nombre: 'A' }, { nombre: 'B' }, { nombre: 'C' }],
        }),
      ),
    );

    expect(error.getStatus?.()).toBe(HttpStatus.BAD_REQUEST);
  });
});
