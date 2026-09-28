import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiCpu,
  FiLoader,
  FiMic,
  FiSend,
  FiZap,
} from 'react-icons/fi';
import { MicButton } from '../../components/assistant/MicButton';
import { CommandBubble } from '../../components/assistant/CommandBubble';
import { assistantRequests } from '../../components/assistant/assistant.requests';
import { ASSISTANT_ACTION_LABELS } from '../../components/assistant/assistant.types';
import type {
  AssistantCommandResponse,
  AssistantLogEntry,
  AssistantPhase,
  AssistantStatus,
  AssistantTurn,
} from '../../components/assistant/assistant.types';
import { getErrorMessage } from '../../helpers/errorHandler';

/** Ejemplos que arrancan la demostración con un clic. */
const SUGERENCIAS = [
  'Da de alta a Marta Bermejo, teléfono 600 123 456, línea PSI para inversores.',
  'Busca pisos en Altabria por debajo de 250.000 € con 3 habitaciones.',
  '¿Qué tengo pendiente de firma?',
  '¿Qué vence en los próximos quince días?',
];

/** Convierte un registro del historial en un turno de la conversación. */
const turnoDesdeHistorial = (registro: AssistantLogEntry): AssistantTurn => ({
  key: `log-${registro.id}`,
  origen: registro.inputType,
  transcripcion: registro.transcripcion ?? '',
  accion: registro.accion
    ? {
        nombre: registro.accion,
        etiqueta:
          ASSISTANT_ACTION_LABELS[registro.accion] ??
          registro.accion.replace(/_/g, ' '),
        argumentos: registro.argumentos ?? {},
      }
    : null,
  resultado: registro.resultado,
  respuesta: registro.respuesta ?? '',
  fecha: registro.createdAt,
  error: registro.error,
});

/** Convierte la respuesta del endpoint en un turno de la conversación. */
const turnoDesdeRespuesta = (
  respuesta: AssistantCommandResponse,
  clave: string,
): AssistantTurn => ({
  key: respuesta.id ? `log-${respuesta.id}` : clave,
  origen: respuesta.origen,
  transcripcion: respuesta.transcripcion,
  accion: respuesta.accion,
  resultado: respuesta.resultado,
  respuesta: respuesta.respuesta,
  fecha: respuesta.fecha,
  error: respuesta.error,
});

/** Texto de estado según la fase en curso. */
const TEXTO_FASE: Record<AssistantPhase, string> = {
  inactivo: '',
  grabando: 'Grabando…',
  transcribiendo: 'Transcribiendo el audio…',
  ejecutando: 'Consultando al asistente… puede tardar unos segundos',
};

/** Alto máximo del campo de orden al crecer, en píxeles (`max-h-32`). */
const ALTO_MAXIMO_TEXTAREA = 128;

/**
 * Asistente de voz e IA: la persona usuaria dicta o escribe una orden y el CRM la
 * ejecuta de verdad (altas, cambios de etapa, búsquedas, contratos y consultas
 * de situación).
 */
export const AssistantView = () => {
  const [turnos, setTurnos] = useState<AssistantTurn[]>([]);
  const [texto, setTexto] = useState('');
  const [fase, setFase] = useState<AssistantPhase>('inactivo');
  const [estado, setEstado] = useState<AssistantStatus | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [segundosEspera, setSegundosEspera] = useState(0);

  const finRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const contadorRef = useRef(0);

  const procesando = fase === 'transcribiendo' || fase === 'ejecutando';

  // Carga inicial: estado del asistente e historial reciente.
  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      try {
        const [estadoActual, historial] = await Promise.all([
          assistantRequests.estado().catch(() => null),
          // `conError: false`: el historial arranca sin las órdenes que
          // fallaron, para no recibir a la persona usuaria con un muro de errores.
          assistantRequests.historial(1, 20, false).catch(() => null),
        ]);

        if (!vigente) return;

        if (estadoActual) setEstado(estadoActual);

        if (historial?.data?.length) {
          // El backend los devuelve del más reciente al más antiguo.
          setTurnos([...historial.data].reverse().map(turnoDesdeHistorial));
        }
      } finally {
        if (vigente) setCargandoHistorial(false);
      }
    };

    void cargar();

    return () => {
      vigente = false;
    };
  }, []);

  // La conversación siempre se mira por el final.
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turnos, fase]);

  // Cronómetro de la espera: una orden puede tardar varios segundos y sin
  // contador parece que la aplicación se ha quedado colgada.
  const [procesandoPrevio, setProcesandoPrevio] = useState(procesando);
  if (procesandoPrevio !== procesando) {
    setProcesandoPrevio(procesando);
    setSegundosEspera(0);
  }

  useEffect(() => {
    if (!procesando) return;

    const reloj = window.setInterval(
      () => setSegundosEspera((previos) => previos + 1),
      1000,
    );

    return () => window.clearInterval(reloj);
  }, [procesando]);

  /** Ajusta el alto del campo de orden a su contenido, hasta el tope. */
  const ajustarAltoTextarea = useCallback(() => {
    const campo = textareaRef.current;
    if (!campo) return;

    campo.style.height = 'auto';
    campo.style.height = `${Math.min(campo.scrollHeight, ALTO_MAXIMO_TEXTAREA)}px`;
  }, []);

  // El alto se recalcula también cuando el texto cambia sin teclear (una
  // sugerencia, o la orden que vuelve al campo tras un fallo).
  useEffect(() => {
    ajustarAltoTextarea();
  }, [texto, ajustarAltoTextarea]);

  /** Añade el turno optimista mientras la orden se procesa. */
  const abrirTurnoPendiente = useCallback(
    (transcripcion: string, origen: 'TEXTO' | 'VOZ'): string => {
      contadorRef.current += 1;
      const clave = `pendiente-${contadorRef.current}`;

      setTurnos((previos) => [
        ...previos,
        {
          key: clave,
          origen,
          transcripcion,
          accion: null,
          resultado: null,
          respuesta:
            origen === 'VOZ'
              ? 'Transcribiendo el audio…'
              : 'Consultando al asistente…',
          fecha: new Date().toISOString(),
          pendiente: true,
        },
      ]);

      return clave;
    },
    [],
  );

  /** Sustituye el turno optimista por el definitivo. */
  const cerrarTurno = useCallback(
    (clave: string, respuesta: AssistantCommandResponse) => {
      setTurnos((previos) =>
        previos.map((turno) =>
          turno.key === clave ? turnoDesdeRespuesta(respuesta, clave) : turno,
        ),
      );
    },
    [],
  );

  /** Retira el turno optimista si la petición falló por completo. */
  const descartarTurno = useCallback((clave: string) => {
    setTurnos((previos) => previos.filter((turno) => turno.key !== clave));
  }, []);

  /**
   * Envía una orden escrita.
   *
   * El endpoint responde 200 aunque el modelo falle (el motivo viaja en
   * `error`), así que el fallo se detecta ahí y no en el `catch`. En cuanto hay
   * fallo, la orden vuelve al campo: nadie debería tener que reescribir de
   * memoria lo que acaba de dictar.
   */
  const enviarOrden = useCallback(
    async (orden: string) => {
      if (!orden || procesando) return;

      setTexto('');
      setFase('ejecutando');
      const clave = abrirTurnoPendiente(orden, 'TEXTO');

      try {
        const respuesta = await assistantRequests.enviarTexto(orden);
        cerrarTurno(clave, respuesta);
        // Solo se devuelve la orden al campo si no llegó a ejecutarse nada: si
        // la acción se ejecutó (aunque fallara en el CRM), repetirla tal cual no
        // arregla nada y sí duplicaría altas.
        if (respuesta.error && !respuesta.accion) setTexto(orden);
      } catch (error) {
        descartarTurno(clave);
        setTexto(orden);
        toast.error(getErrorMessage(error, 'No se ha podido enviar la orden.'));
      } finally {
        setFase('inactivo');
      }
    },
    [procesando, abrirTurnoPendiente, cerrarTurno, descartarTurno],
  );

  const enviarTexto = useCallback(
    () => enviarOrden(texto.trim()),
    [texto, enviarOrden],
  );

  /** Reenvía una orden que falló, retirando antes su burbuja de error. */
  const reintentarTurno = useCallback(
    (turno: AssistantTurn) => {
      descartarTurno(turno.key);
      void enviarOrden(turno.transcripcion);
    },
    [descartarTurno, enviarOrden],
  );

  const enviarAudio = useCallback(
    async (audio: Blob, nombreArchivo: string) => {
      setFase('transcribiendo');
      const clave = abrirTurnoPendiente('', 'VOZ');

      try {
        const respuesta = await assistantRequests.enviarAudio(
          audio,
          nombreArchivo,
        );
        cerrarTurno(clave, respuesta);
      } catch (error) {
        descartarTurno(clave);
        toast.error(getErrorMessage(error, 'No se ha podido enviar el audio.'));
      } finally {
        setFase('inactivo');
      }
    },
    [abrirTurnoPendiente, cerrarTurno, descartarTurno],
  );

  const avisoConfiguracion = useMemo(() => {
    if (!estado) return null;
    if (!estado.iaConfigurada) {
      return 'El motor de IA no está configurado en el servidor: las órdenes no se podrán interpretar.';
    }
    if (!estado.vozConfigurada) {
      return 'La transcripción de voz no está configurada: usa el campo de texto para dictar órdenes.';
    }
    return null;
  }, [estado]);

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 gap-4 overflow-hidden">
      {/* Cabecera */}
      <div className="flex-shrink-0 backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-4 sm:p-5">
        <div className="flex items-center sm:items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600 flex-shrink-0">
            <FiMic className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 drop-shadow-sm">
              Asistente IA
            </h1>
            <p className="hidden sm:block mt-1 text-gray-700 text-sm">
              Dicta o escribe una orden y el asistente la ejecuta en el CRM:
              altas, cambios de etapa, búsquedas, contratos y vencimientos.
            </p>
          </div>
          {estado?.modelo && (
            <div className="hidden lg:flex items-center gap-2 rounded-lg border border-white/40 bg-white/30 px-3 py-1.5 flex-shrink-0">
              <FiCpu className="w-4 h-4 text-blue-700" />
              <span className="text-xs font-medium text-gray-700 select-none">
                {estado.modelo}
              </span>
            </div>
          )}
        </div>

        {avisoConfiguracion && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/50 backdrop-blur-md px-3.5 py-2.5">
            <FiAlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900">{avisoConfiguracion}</p>
          </div>
        )}
      </div>

      {/* Conversación */}
      <div className="flex-1 min-h-0 backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {cargandoHistorial ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : turnos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-8">
              <div className="p-4 rounded-2xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
                <FiZap className="w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  Empieza dictando una orden
                </p>
                <p className="mt-1 text-sm text-gray-600 max-w-md">
                  Mantén pulsado el micrófono para hablar, o haz clic para
                  grabar. También puedes escribirla abajo.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {SUGERENCIAS.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    type="button"
                    onClick={() => setTexto(sugerencia)}
                    className="rounded-full border border-white/40 bg-white/35 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-gray-800 transition-colors hover:bg-white/50 cursor-pointer select-none"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turnos.map((turno) => (
              <CommandBubble
                key={turno.key}
                turno={turno}
                onReintentar={reintentarTurno}
              />
            ))
          )}
          <div ref={finRef} />
        </div>

        {/* Barra de estado en curso */}
        {fase !== 'inactivo' && (
          <div className="flex-shrink-0 flex items-center gap-2.5 px-4 sm:px-5 py-2 border-t border-white/30 bg-white/25 backdrop-blur-md">
            {fase === 'grabando' ? (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
            ) : (
              <FiLoader className="w-4 h-4 text-blue-700 animate-spin" />
            )}
            <span
              className={`text-sm font-medium select-none ${
                fase === 'grabando' ? 'text-red-800' : 'text-blue-900'
              }`}
            >
              {TEXTO_FASE[fase]}
            </span>
            {procesando && segundosEspera > 0 && (
              <span className="text-sm font-semibold text-blue-800 tabular-nums select-none ml-auto">
                {segundosEspera} s
              </span>
            )}
          </div>
        )}
      </div>

      {/* Redacción de la orden */}
      <div className="flex-shrink-0 backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-3 sm:p-4">
        <div className="flex items-end gap-3">
          <MicButton
            onGrabacion={(audio, nombre) => void enviarAudio(audio, nombre)}
            onEstadoCambio={(grabando) =>
              setFase(grabando ? 'grabando' : 'inactivo')
            }
            onError={(mensaje) => toast.error(mensaje)}
            procesando={procesando}
            disabled={Boolean(estado && !estado.iaConfigurada)}
          />

          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' && !evento.shiftKey) {
                  evento.preventDefault();
                  void enviarTexto();
                }
              }}
              rows={1}
              disabled={procesando}
              placeholder="Escribe una orden…"
              className="w-full resize-none overflow-y-auto border border-gray-300 rounded-xl backdrop-blur-md bg-white/50 text-gray-900 placeholder-gray-500 text-sm px-4 py-3 max-h-32 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 hover:border-gray-400 disabled:opacity-60 shadow-sm hover:shadow-md focus:shadow-lg"
            />
          </div>

          <button
            type="button"
            onClick={() => void enviarTexto()}
            disabled={!texto.trim() || procesando}
            aria-label="Enviar la orden"
            className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transition-all duration-200 ease-in-out hover:from-blue-700 hover:to-blue-800 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 cursor-pointer select-none flex-shrink-0"
          >
            {procesando ? (
              <FiLoader className="w-5 h-5 animate-spin" />
            ) : (
              <FiSend className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
