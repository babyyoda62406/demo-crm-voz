/**
 * El camino de la voz, de punta a punta y con dobles.
 *
 *   audio -> transcripcion (ElevenLabs) -> modelo (LLM) -> accion en el CRM
 *         -> segunda llamada al modelo -> frase de confirmacion -> registro
 *
 * Ni ElevenLabs ni el proveedor de LLM se tocan de verdad: se inyectan como
 * objetos con la misma forma, que es justo lo que permite el diseño por
 * interfaces del modulo (`ASSISTANT_ACTION_TOKENS`).
 */
jest.mock('../env/envs', () => ({
  getEnvConfig: () => ({ ELEVENLABS_API_KEY: '', LLM_API_KEY: '', LLM_MODEL: 'demo' }),
}));

import { AssistantService } from './assistant.service';
import { AssistantInputType } from './enums/assistant-input-type.enum';
import {
  AssistantActionName,
  IAssistantActionResult,
} from '../common/contracts/assistant-actions';
import { ASSISTANT_TOOLS, ASSISTANT_TOOL_NAMES } from './tools/assistant-tools';

const audio = {
  buffer: Buffer.from('fake-webm'),
  originalname: 'orden.webm',
  mimetype: 'audio/webm',
  size: 9,
};

/** Respuesta del modelo pidiendo una herramienta concreta. */
const conHerramienta = (nombre: string, args: Record<string, unknown>) => ({
  ok: true,
  message: {
    role: 'assistant' as const,
    content: null as string | null,
    tool_calls: [
      {
        id: 'call_1',
        type: 'function' as const,
        function: { name: nombre, arguments: JSON.stringify(args) },
      },
    ],
  },
});

/** Respuesta del modelo en modo conversacion, sin herramienta. */
const soloTexto = (texto: string) => ({
  ok: true,
  message: { role: 'assistant' as const, content: texto },
});

type Escenario = {
  servicio: AssistantService;
  eleven: { transcribe: jest.Mock; estaConfigurado: boolean };
  llm: { chat: jest.Mock; estaConfigurado: boolean; modelo: string };
  clientes: {
    createClient: jest.Mock;
    moveClientStage: jest.Mock;
    findClients: jest.Mock;
  };
  logDAO: { create: jest.Mock; save: jest.Mock };
};

const montar = (
  opciones: { conClientes?: boolean; conInmuebles?: boolean } = {},
): Escenario => {
  const { conClientes = true, conInmuebles = false } = opciones;

  const eleven = { transcribe: jest.fn(), estaConfigurado: true };
  const llm = { chat: jest.fn(), estaConfigurado: true, modelo: 'demo-model' };
  const clientes = {
    createClient: jest.fn(),
    moveClientStage: jest.fn(),
    findClients: jest.fn(),
  };
  const logDAO = {
    create: jest.fn((datos: unknown) => ({ ...(datos as object) })),
    save: jest.fn(async (fila: unknown) => ({
      id: 1,
      createdAt: new Date('2026-03-10T09:00:00Z'),
      ...(fila as object),
    })),
  };

  const servicio = new AssistantService(
    logDAO as never,
    eleven as never,
    llm as never,
    conClientes ? (clientes as never) : undefined,
    conInmuebles ? ({ findProperties: jest.fn(), createProperty: jest.fn() } as never) : undefined,
    undefined,
    undefined,
  );

  return { servicio, eleven, llm, clientes, logDAO };
};

const ok = (mensaje: string, data?: unknown): IAssistantActionResult => ({
  ok: true,
  mensaje,
  data,
});

describe('orden dictada de punta a punta', () => {
  it('transcribe el audio, llama a la herramienta y devuelve la confirmacion hablada', async () => {
    const { servicio, eleven, llm, clientes } = montar();

    eleven.transcribe.mockResolvedValue({
      ok: true,
      texto: 'Da de alta a Marta Bermejo, línea PSI para inversores',
    });
    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.CREAR_CLIENTE, {
          nombre: 'Marta',
          apellidos: 'Bermejo Salas',
          lineaNegocio: 'psi',
        }),
      )
      .mockResolvedValueOnce(soloTexto('Marta Bermejo Salas dada de alta en PSI.'));
    clientes.createClient.mockResolvedValue(
      ok('Cliente creado', { id: 12, nombre: 'Marta' }),
    );

    const respuesta = await servicio.processCommand({ audio, userId: 3 });

    expect(eleven.transcribe).toHaveBeenCalledWith(audio);
    expect(respuesta.origen).toBe(AssistantInputType.VOZ);
    expect(respuesta.transcripcion).toContain('Marta Bermejo');
    expect(respuesta.accion?.nombre).toBe(AssistantActionName.CREAR_CLIENTE);
    expect(clientes.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Marta', lineaNegocio: 'psi' }),
    );
    expect(respuesta.respuesta).toBe('Marta Bermejo Salas dada de alta en PSI.');
    expect(respuesta.error).toBeNull();
  });

  it('la primera llamada al modelo lleva el catalogo de herramientas', async () => {
    const { servicio, llm, clientes } = montar();

    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.BUSCAR_CLIENTES, {}),
      )
      .mockResolvedValueOnce(soloTexto('Hay 24 clientes activos.'));
    clientes.findClients.mockResolvedValue(ok('Hay 24 clientes activos', []));

    await servicio.processCommand({ texto: '¿cuántos clientes activos hay?' });

    const [, opciones] = llm.chat.mock.calls[0];
    expect(opciones.tools).toBe(ASSISTANT_TOOLS);
    // La segunda llamada es solo de redaccion: sin herramientas, para que el
    // modelo no vuelva a intentar ejecutar nada.
    const [, opcionesRedaccion] = llm.chat.mock.calls[1];
    expect(opcionesRedaccion.tools).toBeUndefined();
  });

  it('si la transcripcion falla no se llama al modelo y se explica el motivo', async () => {
    const { servicio, eleven, llm } = montar();

    eleven.transcribe.mockResolvedValue({
      ok: false,
      mensaje: 'No se ha entendido el audio. Habla un poco más cerca del micrófono.',
    });

    const respuesta = await servicio.processCommand({ audio });

    expect(llm.chat).not.toHaveBeenCalled();
    expect(respuesta.accion).toBeNull();
    expect(respuesta.respuesta).toContain('No se ha entendido el audio');
    expect(respuesta.error).toBe(respuesta.respuesta);
  });

  it('una orden vacia no llega al modelo', async () => {
    const { servicio, llm } = montar();

    const respuesta = await servicio.processCommand({ texto: '   ' });

    expect(llm.chat).not.toHaveBeenCalled();
    expect(respuesta.respuesta).toContain('No he recibido ninguna orden');
  });

  it('si el modelo no responde, la persona usuaria recibe el motivo en español', async () => {
    const { servicio, llm, clientes } = montar();

    llm.chat.mockResolvedValue({
      ok: false,
      mensaje: 'El modelo está saturado ahora mismo. Inténtalo de nuevo en unos segundos.',
    });

    const respuesta = await servicio.processCommand({ texto: 'da de alta a Ana' });

    expect(clientes.createClient).not.toHaveBeenCalled();
    expect(respuesta.respuesta).toContain('saturado');
    expect(respuesta.error).toBe(respuesta.respuesta);
  });

  it('si el modelo solo conversa, no se ejecuta nada y no es un error', async () => {
    const { servicio, llm, clientes } = montar();

    llm.chat.mockResolvedValueOnce(
      soloTexto('¿De qué línea de negocio es el cliente?'),
    );

    const respuesta = await servicio.processCommand({ texto: 'da de alta a Ana' });

    expect(clientes.createClient).not.toHaveBeenCalled();
    expect(respuesta.accion).toBeNull();
    expect(respuesta.respuesta).toBe('¿De qué línea de negocio es el cliente?');
    // Pedir un dato que falta no es un fallo: la vista no debe pintarlo en rojo.
    expect(respuesta.error).toBeNull();
  });

  it('una herramienta inventada por el modelo no se ejecuta', async () => {
    const { servicio, llm, clientes } = montar();

    llm.chat.mockResolvedValueOnce(conHerramienta('borrar_base_de_datos', {}));

    const respuesta = await servicio.processCommand({ texto: 'haz algo raro' });

    expect(clientes.createClient).not.toHaveBeenCalled();
    expect(respuesta.accion).toBeNull();
    expect(respuesta.respuesta).toContain('No he sabido interpretar la orden');
  });

  it('si el dominio no esta montado, se dice en vez de reventar', async () => {
    const { servicio, llm } = montar({ conClientes: false });

    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.CREAR_CLIENTE, { nombre: 'Ana' }),
      )
      .mockResolvedValueOnce(soloTexto('Ese módulo todavía no está disponible.'));

    const respuesta = await servicio.processCommand({ texto: 'da de alta a Ana' });

    expect(respuesta.error).toContain('todavía no está disponible');
  });

  it('si la accion del dominio lanza, la orden termina con un mensaje accionable', async () => {
    const { servicio, llm, clientes } = montar();

    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.CREAR_CLIENTE, { nombre: 'Ana' }),
      )
      .mockResolvedValueOnce(soloTexto('No se ha podido dar de alta.'));
    clientes.createClient.mockRejectedValue(new Error('columna inexistente'));

    const respuesta = await servicio.processCommand({ texto: 'da de alta a Ana' });

    expect(respuesta.error).toContain('La acción ha fallado al ejecutarse');
    // El detalle tecnico no viaja al cliente.
    expect(respuesta.error).not.toContain('columna inexistente');
  });

  it('si el modelo no redacta la confirmacion, se usa el mensaje del dominio', async () => {
    const { servicio, llm, clientes } = montar();

    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.BUSCAR_CLIENTES, {}),
      )
      .mockResolvedValueOnce(soloTexto('   '));
    clientes.findClients.mockResolvedValue(ok('Hay 24 clientes activos.', []));

    const respuesta = await servicio.processCommand({ texto: '¿cuántos hay?' });

    expect(respuesta.respuesta).toBe('Hay 24 clientes activos.');
  });

  it('cada orden queda registrada con su origen y su duracion', async () => {
    const { servicio, llm, clientes, logDAO } = montar();

    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.BUSCAR_CLIENTES, {}),
      )
      .mockResolvedValueOnce(soloTexto('Hay 24.'));
    clientes.findClients.mockResolvedValue(ok('Hay 24 clientes activos.', []));

    const respuesta = await servicio.processCommand({
      texto: '¿cuántos hay?',
      userId: 9,
    });

    expect(respuesta.id).toBe(1);
    expect(respuesta.fecha).toBe('2026-03-10T09:00:00.000Z');
    expect(logDAO.save).toHaveBeenCalledTimes(1);
    const guardado = logDAO.create.mock.calls[0][0];
    expect(guardado.inputType).toBe(AssistantInputType.TEXTO);
    expect(guardado.userId).toBe(9);
    expect(typeof guardado.duracionMs).toBe('number');
  });

  it('si el registro falla, la respuesta llega igual', async () => {
    const { servicio, llm, clientes, logDAO } = montar();

    llm.chat
      .mockResolvedValueOnce(
        conHerramienta(AssistantActionName.BUSCAR_CLIENTES, {}),
      )
      .mockResolvedValueOnce(soloTexto('Hay 24.'));
    clientes.findClients.mockResolvedValue(ok('Hay 24 clientes activos.', []));
    logDAO.save.mockRejectedValue(new Error('base de datos caida'));

    const respuesta = await servicio.processCommand({ texto: '¿cuántos hay?' });

    expect(respuesta.respuesta).toBe('Hay 24.');
    expect(respuesta.id).toBeUndefined();
  });
});

describe('lo que se le enseña al modelo del resultado', () => {
  const resumir = (servicio: AssistantService, resultado: unknown) =>
    (
      servicio as unknown as {
        resumirParaModelo: (r: unknown) => Record<string, unknown>;
      }
    ).resumirParaModelo(resultado);

  it('el recuento bueno viaja en «mensaje», no en el tamaño de la pagina', () => {
    const { servicio } = montar();
    const veinticuatro = Array.from({ length: 24 }, (_, i) => ({ id: i + 1 }));

    const resumen = resumir(
      servicio,
      ok('Hay 24 clientes activos en la cartera.', veinticuatro),
    );

    // `mostrados` se llama asi a proposito: mientras se llamo `total`, el modelo
    // lo tomaba por la respuesta y contestaba «hay 10 clientes» teniendo 24.
    expect(resumen.mostrados).toBe(24);
    expect((resumen.elementos as unknown[]).length).toBe(10);
    expect(resumen.aviso).toContain('primeros 10 de 24');
    expect(resumen.mensaje).toBe('Hay 24 clientes activos en la cartera.');
    expect(resumen).not.toHaveProperty('total');
  });

  it('un unico elemento viaja entero', () => {
    const { servicio } = montar();

    const resumen = resumir(servicio, ok('Cliente creado', { id: 12 }));

    expect(resumen.elemento).toEqual({ id: 12 });
    expect(resumen).not.toHaveProperty('elementos');
  });
});

describe('normalizacion de lo que dicta la voz', () => {
  const normalizar = (servicio: AssistantService, valor: string) =>
    (
      servicio as unknown as { normalizarSeparadores: (v: string) => string }
    ).normalizarSeparadores(valor);

  const etapaReal = (servicio: AssistantService, valor: unknown) =>
    (
      servicio as unknown as { aEtapaReal: (v: unknown) => string | undefined }
    ).aEtapaReal(valor);

  const tamanoPagina = (servicio: AssistantService, valor: unknown) =>
    (
      servicio as unknown as { aTamanoPagina: (v: unknown) => number | undefined }
    ).aTamanoPagina(valor);

  it('«250.000» dictado son doscientos cincuenta mil, no 250 con decimales', () => {
    const { servicio } = montar();

    expect(normalizar(servicio, '250.000')).toBe('250000');
    expect(normalizar(servicio, '1.234.567')).toBe('1234567');
    expect(normalizar(servicio, '1.234,56')).toBe('1234.56');
    expect(normalizar(servicio, '1,234.56')).toBe('1234.56');
    // Con una o dos cifras detras el punto SI es decimal.
    expect(normalizar(servicio, '1.5')).toBe('1.5');
    expect(normalizar(servicio, '1,5')).toBe('1.5');
  });

  it('«activos» no es una etapa del embudo y no se manda como filtro', () => {
    const { servicio } = montar();

    // Sin esta guarda el modelo mandaba etapa:"activos", la busqueda devolvia
    // cero y parecia que la cartera estaba vacia.
    expect(etapaReal(servicio, 'activos')).toBeUndefined();
    expect(etapaReal(servicio, 'en cartera')).toBeUndefined();
    expect(etapaReal(servicio, 'todas')).toBeUndefined();
    expect(etapaReal(servicio, 'Notaría')).toBe('Notaría');
  });

  it('el tamaño de pagina que pide el modelo se acota', () => {
    const { servicio } = montar();

    expect(tamanoPagina(servicio, 1000)).toBe(50);
    expect(tamanoPagina(servicio, 0)).toBeUndefined();
    expect(tamanoPagina(servicio, -3)).toBeUndefined();
    expect(tamanoPagina(servicio, '7.9')).toBe(7);
  });
});

describe('catalogo de herramientas expuesto al modelo', () => {
  it('cada herramienta corresponde a una accion declarada', () => {
    const acciones = new Set<string>(Object.values(AssistantActionName));

    for (const herramienta of ASSISTANT_TOOLS) {
      expect(acciones.has(herramienta.function.name)).toBe(true);
    }
    expect(ASSISTANT_TOOL_NAMES.size).toBe(ASSISTANT_TOOLS.length);
    expect(ASSISTANT_TOOL_NAMES.size).toBe(acciones.size);
  });

  it('todo parametro obligatorio existe en el esquema de su herramienta', () => {
    for (const herramienta of ASSISTANT_TOOLS) {
      const propiedades = Object.keys(
        herramienta.function.parameters?.properties ?? {},
      );
      for (const obligatorio of herramienta.function.parameters?.required ?? []) {
        expect(propiedades).toContain(obligatorio);
      }
    }
  });

  it('el estado indica que dominios estan enchufados', () => {
    const { servicio } = montar({ conClientes: true, conInmuebles: false });

    const estado = servicio.getStatus();
    const porNombre = new Map(estado.acciones.map((a) => [a.nombre, a.disponible]));

    expect(porNombre.get(AssistantActionName.CREAR_CLIENTE)).toBe(true);
    expect(porNombre.get(AssistantActionName.BUSCAR_INMUEBLES)).toBe(false);
    expect(porNombre.get(AssistantActionName.FIRMAS_PENDIENTES)).toBe(false);
  });
});
