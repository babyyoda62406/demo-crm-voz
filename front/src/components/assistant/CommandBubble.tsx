import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiCpu,
  FiEdit3,
  FiFilePlus,
  FiFileText,
  FiHome,
  FiMic,
  FiPenTool,
  FiRefreshCw,
  FiSearch,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { ASSISTANT_ACTIONS } from './assistant.types';
import type { AssistantTurn } from './assistant.types';
import { ResultCard } from './ResultCard';

/** Icono de cada acción, para identificarla de un vistazo. */
const ICONOS_ACCION: Record<string, IconType> = {
  [ASSISTANT_ACTIONS.CREAR_CLIENTE]: FiUserPlus,
  [ASSISTANT_ACTIONS.MOVER_ETAPA_CLIENTE]: FiEdit3,
  [ASSISTANT_ACTIONS.BUSCAR_CLIENTES]: FiUsers,
  [ASSISTANT_ACTIONS.BUSCAR_INMUEBLES]: FiSearch,
  [ASSISTANT_ACTIONS.CREAR_INMUEBLE]: FiHome,
  [ASSISTANT_ACTIONS.GENERAR_CONTRATO]: FiFilePlus,
  [ASSISTANT_ACTIONS.CONTRATOS_POR_ESTADO]: FiFileText,
  [ASSISTANT_ACTIONS.FIRMAS_PENDIENTES]: FiPenTool,
  [ASSISTANT_ACTIONS.VENCIMIENTOS_PROXIMOS]: FiCalendar,
};

/** Hora corta de la marca temporal del turno. */
const hora = (fecha: string): string => {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(valor);
};

interface CommandBubbleProps {
  turno: AssistantTurn;
  /** Reenvía la orden de un turno que falló. */
  onReintentar?: (turno: AssistantTurn) => void;
}

/**
 * Un turno completo de la conversación: la orden de la persona usuaria (dictada o
 * escrita), la acción que el asistente ejecutó y su respuesta.
 *
 * Un turno fallido se pinta en ámbar y con icono de alerta, nunca con el mismo
 * aspecto que una respuesta buena: la persona usuaria tiene que distinguir de un vistazo
 * «el asistente me ha contestado» de «el asistente se ha roto».
 */
export const CommandBubble = ({ turno, onReintentar }: CommandBubbleProps) => {
  const IconoAccion = turno.accion
    ? (ICONOS_ACCION[turno.accion.nombre] ?? FiCheckCircle)
    : null;

  const marca = hora(turno.fecha);
  const fallido = Boolean(turno.error) && !turno.pendiente;

  // Solo se ofrece reintentar cuando no llegó a ejecutarse ninguna acción: ahí
  // el fallo es del modelo y repetir la misma orden suele salvarla. Si la acción
  // sí se ejecutó y falló en el CRM (un cliente que no existe, por ejemplo),
  // repetirla daría exactamente el mismo resultado.
  const puedeReintentar =
    fallido && !turno.accion && Boolean(onReintentar) && Boolean(turno.transcripcion);

  return (
    <div className="space-y-3">
      {/* Orden de la persona usuaria */}
      {turno.transcripcion && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              {turno.origen === 'VOZ' ? (
                <FiMic className="w-3.5 h-3.5 text-blue-100" />
              ) : (
                <FiEdit3 className="w-3.5 h-3.5 text-blue-100" />
              )}
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100 select-none">
                {turno.origen === 'VOZ' ? 'Dictado' : 'Escrito'}
              </span>
              {marca && (
                <span className="text-[11px] text-blue-200 select-none ml-auto">
                  {marca}
                </span>
              )}
            </div>
            <p className="text-sm text-white whitespace-pre-wrap break-words">
              {turno.transcripcion}
            </p>
          </div>
        </div>
      )}

      {/* Respuesta del asistente */}
      <div className="flex justify-start">
        <div
          className={`max-w-[85%] w-full sm:w-auto rounded-xl rounded-tl-sm backdrop-blur-xl px-4 py-3 shadow-md ${
            fallido
              ? 'bg-amber-50/70 border border-amber-300/70'
              : 'bg-white/40 border border-white/40'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className={`p-1 rounded-md ${
                fallido
                  ? 'bg-amber-100/80 text-amber-700'
                  : 'bg-blue-100/70 text-blue-700'
              }`}
            >
              {fallido ? (
                <FiAlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <FiCpu className="w-3.5 h-3.5" />
              )}
            </div>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider select-none ${
                fallido ? 'text-amber-900' : 'text-gray-700'
              }`}
            >
              {fallido ? 'Orden no completada' : 'Asistente'}
            </span>
          </div>

          {/* Acción ejecutada */}
          {turno.accion && IconoAccion && (
            <div className="inline-flex items-center gap-1.5 mb-2 rounded-full border border-blue-200/70 bg-blue-50/60 px-2.5 py-1">
              <IconoAccion className="w-3.5 h-3.5 text-blue-700" />
              <span className="text-xs font-semibold text-blue-900 select-none">
                {turno.accion.etiqueta}
              </span>
              {turno.resultado?.ok && (
                <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
          )}

          {turno.pendiente ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
              </span>
              <p className="text-sm text-gray-600">{turno.respuesta}</p>
            </div>
          ) : (
            <p
              className={`text-sm whitespace-pre-wrap break-words ${
                fallido ? 'text-amber-900' : 'text-gray-900'
              }`}
            >
              {turno.respuesta}
            </p>
          )}

          {puedeReintentar && (
            <button
              type="button"
              onClick={() => onReintentar?.(turno)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-amber-100/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-200/70 cursor-pointer select-none"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          )}

          {!turno.pendiente && (
            <ResultCard
              accion={turno.accion?.nombre ?? null}
              resultado={turno.resultado}
            />
          )}
        </div>
      </div>
    </div>
  );
};
