/**
 * Cadena de dos proveedores de LLM con failover real.
 *
 * Es la pieza que decide si una orden dictada llega a ejecutarse cuando el
 * proveedor principal esta caido, saturado o devuelve un 200 vacio. Se prueba
 * con `axios` interceptado y el entorno sustituido, sin red.
 */
import axios from 'axios';

jest.mock('axios');
jest.mock('../../env/envs', () => ({
  getEnvConfig: jest.fn(),
}));

import { getEnvConfig } from '../../env/envs';
import { NvidiaService } from './nvidia.service';

const post = axios.post as unknown as jest.Mock;
const entorno = getEnvConfig as unknown as jest.Mock;

const ENTORNO_BASE = {
  LLM_BASE_URL: 'https://primario.example/v1',
  LLM_API_KEY: 'clave-primaria',
  LLM_MODEL: 'modelo-primario',
  LLM_TIMEOUT_MS: 8000,
  LLM_FALLBACK_BASE_URL: 'https://respaldo.example/v1',
  LLM_FALLBACK_API_KEY: 'clave-respaldo',
  LLM_FALLBACK_MODEL: 'modelo-respaldo',
  LLM_FALLBACK_TIMEOUT_MS: 15000,
};

/** Pausas registradas en vez de dormidas, para que la suite no tarde 13 s. */
const esperas: number[] = [];

const conEntorno = (extra: Record<string, unknown> = {}) => {
  entorno.mockReturnValue({ ...ENTORNO_BASE, ...extra });
  const servicio = new NvidiaService();
  (servicio as unknown as { esperar: (ms: number) => Promise<void> }).esperar = (
    ms: number,
  ) => {
    esperas.push(ms);
    return Promise.resolve();
  };
  return servicio;
};

/** Respuesta 200 valida del proveedor. */
const respuestaUtil = (contenido = 'hecho') => ({
  data: { choices: [{ message: { role: 'assistant', content: contenido } }] },
});

/** Error con forma de AxiosError para un HTTP concreto. */
const errorHttp = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

beforeEach(() => {
  jest.clearAllMocks();
  esperas.length = 0;
  entorno.mockReturnValue(ENTORNO_BASE);
});

describe('configuracion de la cadena', () => {
  it('sin ninguna clave el asistente se declara no configurado', async () => {
    const servicio = conEntorno({ LLM_API_KEY: '', LLM_FALLBACK_API_KEY: '' });

    expect(servicio.estaConfigurado).toBe(false);

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toContain('no está configurado');
    expect(post).not.toHaveBeenCalled();
  });

  it('un proveedor sin clave no gasta su turno', async () => {
    const servicio = conEntorno({ LLM_FALLBACK_API_KEY: '', LLM_API_KEY: 'solo-primario' });
    post.mockRejectedValue(errorHttp(500));

    await servicio.chat([{ role: 'user', content: 'hola' }]);

    // El respaldo hereda la clave del primario cuando la suya esta vacia, asi
    // que aqui hay dos proveedores validos y dos intentos.
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('el modelo anunciado en la interfaz es el del primario', () => {
    expect(conEntorno().modelo).toBe('modelo-primario');
  });
});

describe('failover', () => {
  it('con el primario respondiendo, el respaldo ni se toca', async () => {
    const servicio = conEntorno();
    post.mockResolvedValue(respuestaUtil());

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    expect(resultado.ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(
      'https://primario.example/v1/chat/completions',
    );
    expect(post.mock.calls[0][1].model).toBe('modelo-primario');
  });

  it('un 5xx del primario pasa la MISMA peticion al respaldo', async () => {
    const servicio = conEntorno();
    post
      .mockRejectedValueOnce(errorHttp(503))
      .mockResolvedValueOnce(respuestaUtil('resuelto por el respaldo'));

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }], {
      tools: [{ type: 'function', function: { name: 'x' } }] as never,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.message?.content).toBe('resuelto por el respaldo');
    expect(post).toHaveBeenCalledTimes(2);

    const [urlRespaldo, cuerpoRespaldo, opcionesRespaldo] = post.mock.calls[1];
    expect(urlRespaldo).toBe('https://respaldo.example/v1/chat/completions');
    expect(cuerpoRespaldo.model).toBe('modelo-respaldo');
    // El respaldo recibe exactamente la misma conversacion y herramientas.
    expect(cuerpoRespaldo.messages).toEqual(post.mock.calls[0][1].messages);
    expect(cuerpoRespaldo.tools).toEqual(post.mock.calls[0][1].tools);
    expect(opcionesRespaldo.headers.Authorization).toBe('Bearer clave-respaldo');
    expect(opcionesRespaldo.timeout).toBe(15000);
    // Ante un fallo pasajero se espera antes de reintentar.
    expect(esperas).toEqual([800]);
  });

  it('un fallo determinista salta al respaldo sin perder tiempo esperando', async () => {
    const servicio = conEntorno();
    post.mockRejectedValueOnce(errorHttp(401)).mockResolvedValueOnce(respuestaUtil());

    await servicio.chat([{ role: 'user', content: 'hola' }]);

    expect(esperas).toEqual([]);
  });

  it('un 200 sin contenido utilizable tambien cede el turno', async () => {
    const servicio = conEntorno();
    post
      .mockResolvedValueOnce({ data: { choices: [{ message: { content: '  ' } }] } })
      .mockResolvedValueOnce(respuestaUtil('ahora si'));

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    expect(resultado.ok).toBe(true);
    expect(resultado.message?.content).toBe('ahora si');
  });

  it('una llamada a herramienta sin texto SI es contenido utilizable', async () => {
    const servicio = conEntorno();
    post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                { id: '1', type: 'function', function: { name: 'buscar_clientes', arguments: '{}' } },
              ],
            },
          },
        ],
      },
    });

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    // Es el camino feliz del asistente: el modelo contesta solo con la
    // herramienta. Tratarlo como respuesta vacia dispararia un failover inutil.
    expect(resultado.ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('un 401 del primario se intenta igual en el respaldo si es otro proveedor', async () => {
    const servicio = conEntorno();
    post
      .mockRejectedValueOnce(errorHttp(401))
      .mockResolvedValueOnce(respuestaUtil());

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    // Una clave caducada en el primario es justo el caso que el respaldo
    // existe para salvar: cortar ahi dejaba el CRM sin asistente.
    expect(resultado.ok).toBe(true);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('un 401 no se repite cuando los dos proveedores comparten origen y clave', async () => {
    const servicio = conEntorno({
      LLM_FALLBACK_BASE_URL: '',
      LLM_FALLBACK_API_KEY: '',
      LLM_FALLBACK_MODEL: '',
    });
    post.mockRejectedValue(errorHttp(401));

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    expect(resultado.ok).toBe(false);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('si fallan los dos se devuelve un motivo en español, sin lanzar', async () => {
    const servicio = conEntorno();
    post.mockRejectedValue(errorHttp(429));

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toContain('saturado');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('traduce cada fallo a un mensaje accionable', async () => {
    const casos: [number | string, string][] = [
      [401, 'La clave del servicio de IA no es válida'],
      [400, 'El modelo ha rechazado la petición'],
      [500, 'El servicio de IA no está disponible'],
    ];

    for (const [status, esperado] of casos) {
      jest.clearAllMocks();
      const servicio = conEntorno();
      post.mockRejectedValue(errorHttp(status as number));

      const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);
      expect(resultado.mensaje).toContain(esperado);
    }
  });

  it('un timeout se traduce como tal', async () => {
    const servicio = conEntorno();
    post.mockRejectedValue(
      Object.assign(new Error('timeout of 8000ms exceeded'), {
        code: 'ECONNABORTED',
      }),
    );

    const resultado = await servicio.chat([{ role: 'user', content: 'hola' }]);

    expect(resultado.mensaje).toContain('ha tardado demasiado');
  });
});
