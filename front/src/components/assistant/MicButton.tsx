import { useCallback, useEffect, useRef, useState } from 'react';
import { FiMic, FiSquare, FiLoader } from 'react-icons/fi';

/** Formatos de grabación por orden de preferencia. */
const FORMATOS_AUDIO = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
];

/**
 * A partir de esta duración de pulsación se interpreta "mantener para grabar":
 * al soltar, la grabación termina. Por debajo, es un clic que la deja abierta.
 */
const UMBRAL_PULSACION_MS = 400;

/** Duración máxima de una grabación, como red de seguridad. */
const DURACION_MAXIMA_MS = 120000;

interface MicButtonProps {
  /** Se invoca con el audio grabado cuando la grabación termina. */
  onGrabacion: (audio: Blob, nombreArchivo: string) => void;
  /** Notifica los cambios de estado de grabación al contenedor. */
  onEstadoCambio?: (grabando: boolean) => void;
  /** Se invoca si el micrófono no está disponible o se deniega el permiso. */
  onError?: (mensaje: string) => void;
  disabled?: boolean;
  /** `true` mientras la orden anterior se está procesando. */
  procesando?: boolean;
  className?: string;
}

/**
 * Botón de dictado. Admite dos gestos:
 * - Mantener pulsado: graba mientras se sujeta y envía al soltar.
 * - Clic corto: inicia la grabación; un segundo clic la detiene.
 */
export const MicButton = ({
  onGrabacion,
  onEstadoCambio,
  onError,
  disabled = false,
  procesando = false,
  className = '',
}: MicButtonProps) => {
  const [grabando, setGrabando] = useState(false);
  const [solicitandoPermiso, setSolicitandoPermiso] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const grabadorRef = useRef<MediaRecorder | null>(null);
  const fragmentosRef = useRef<Blob[]>([]);
  const pistaRef = useRef<MediaStream | null>(null);
  const inicioPulsacionRef = useRef<number>(0);
  /** `true` mientras el puntero sigue pulsado sobre el botón. */
  const pulsandoRef = useRef(false);
  const limiteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cronometroRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const montadoRef = useRef(true);

  /** Libera micrófono y temporizadores. */
  const liberarRecursos = useCallback(() => {
    if (limiteRef.current) {
      clearTimeout(limiteRef.current);
      limiteRef.current = null;
    }
    if (cronometroRef.current) {
      clearInterval(cronometroRef.current);
      cronometroRef.current = null;
    }
    pistaRef.current?.getTracks().forEach((pista) => pista.stop());
    pistaRef.current = null;
    grabadorRef.current = null;
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      liberarRecursos();
    };
  }, [liberarRecursos]);

  /** Elige el primer contenedor de audio soportado por el navegador. */
  const elegirFormato = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    return (
      FORMATOS_AUDIO.find((formato) => MediaRecorder.isTypeSupported(formato)) ??
      ''
    );
  };

  const detener = useCallback(() => {
    const grabador = grabadorRef.current;
    if (grabador && grabador.state !== 'inactive') {
      grabador.stop();
    }
  }, []);

  const iniciar = useCallback(async () => {
    if (disabled || procesando || grabando || solicitandoPermiso) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError?.(
        'Este navegador no permite grabar audio. Escribe la orden en el campo de texto.',
      );
      return;
    }

    setSolicitandoPermiso(true);

    try {
      const pista = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // El componente pudo desmontarse mientras se pedía el permiso.
      if (!montadoRef.current) {
        pista.getTracks().forEach((p) => p.stop());
        return;
      }

      pistaRef.current = pista;
      fragmentosRef.current = [];

      const formato = elegirFormato();
      const grabador = new MediaRecorder(pista, formato ? { mimeType: formato } : undefined);
      grabadorRef.current = grabador;

      grabador.ondataavailable = (evento: BlobEvent) => {
        if (evento.data && evento.data.size > 0) {
          fragmentosRef.current.push(evento.data);
        }
      };

      grabador.onstop = () => {
        const tipo = grabador.mimeType || formato || 'audio/webm';
        const audio = new Blob(fragmentosRef.current, { type: tipo });
        fragmentosRef.current = [];

        liberarRecursos();

        if (montadoRef.current) {
          setGrabando(false);
          setSegundos(0);
          onEstadoCambio?.(false);
        }

        // Por debajo de este tamaño la grabación es ruido: no merece la pena
        // gastar una transcripción.
        if (audio.size < 1200) {
          onError?.('La grabación ha sido demasiado corta. Inténtalo de nuevo.');
          return;
        }

        const extension = tipo.includes('ogg')
          ? 'ogg'
          : tipo.includes('mp4')
            ? 'm4a'
            : 'webm';

        onGrabacion(audio, `orden.${extension}`);
      };

      grabador.start();

      setGrabando(true);
      setSegundos(0);
      onEstadoCambio?.(true);

      cronometroRef.current = setInterval(() => {
        setSegundos((valor) => valor + 1);
      }, 1000);

      limiteRef.current = setTimeout(detener, DURACION_MAXIMA_MS);
    } catch {
      onError?.(
        'No se ha podido acceder al micrófono. Revisa los permisos del navegador.',
      );
    } finally {
      if (montadoRef.current) setSolicitandoPermiso(false);
    }
  }, [
    disabled,
    procesando,
    grabando,
    solicitandoPermiso,
    onError,
    onGrabacion,
    onEstadoCambio,
    liberarRecursos,
    detener,
  ]);

  const alPulsar = (evento: React.PointerEvent<HTMLButtonElement>) => {
    evento.preventDefault();

    // Si ya está grabando (modo clic), esta pulsación la detiene.
    if (grabando) {
      pulsandoRef.current = false;
      detener();
      return;
    }

    pulsandoRef.current = true;
    inicioPulsacionRef.current = Date.now();
    void iniciar();
  };

  /**
   * Cierre de la pulsación. Solo actúa si el puntero seguía pulsado sobre el
   * botón: así, tras un clic corto (que deja la grabación abierta), sacar el
   * ratón del botón no la interrumpe.
   */
  const alSoltar = (evento: React.PointerEvent<HTMLButtonElement>) => {
    evento.preventDefault();

    if (!pulsandoRef.current) return;
    pulsandoRef.current = false;

    const duracion = Date.now() - inicioPulsacionRef.current;

    // Pulsación larga: "mantener para grabar", se envía al soltar.
    // Pulsación corta: la grabación queda abierta hasta el siguiente clic.
    if (grabando && duracion >= UMBRAL_PULSACION_MS) {
      detener();
    }
  };

  const ocupado = disabled || procesando;

  const formatoTiempo = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(
    segundos % 60,
  ).padStart(2, '0')}`;

  const clasesEstado = grabando
    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-400/40 shadow-lg'
    : ocupado
      ? 'backdrop-blur-md bg-white/30 text-gray-400 border-white/30'
      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-400/40 shadow-lg hover:from-blue-700 hover:to-blue-800 hover:shadow-xl';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onPointerDown={alPulsar}
        onPointerUp={alSoltar}
        onPointerLeave={alSoltar}
        onContextMenu={(evento) => evento.preventDefault()}
        disabled={ocupado}
        aria-label={grabando ? 'Detener la grabación' : 'Dictar una orden'}
        aria-pressed={grabando}
        title={
          grabando
            ? 'Suelta o vuelve a pulsar para enviar'
            : 'Mantén pulsado para dictar, o haz clic para grabar'
        }
        className={`relative flex items-center justify-center w-14 h-14 rounded-full border transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed transform active:scale-95 cursor-pointer select-none touch-none ${clasesEstado}`}
      >
        {/* Pulso rojo mientras se graba */}
        {grabando && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/60 animate-ping" />
            <span className="absolute -inset-1 rounded-full border-2 border-red-400/50 animate-pulse" />
          </>
        )}

        {solicitandoPermiso ? (
          <FiLoader className="w-6 h-6 animate-spin relative z-10 pointer-events-none" />
        ) : grabando ? (
          <FiSquare className="w-5 h-5 relative z-10 pointer-events-none fill-current" />
        ) : (
          <FiMic className="w-6 h-6 relative z-10 pointer-events-none" />
        )}
      </button>

      {grabando && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md bg-red-50/60 border border-red-200/60">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
          <span className="text-sm font-semibold text-red-800 tabular-nums select-none">
            {formatoTiempo}
          </span>
        </div>
      )}
    </div>
  );
};
