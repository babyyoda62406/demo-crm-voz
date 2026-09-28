import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronRight,
  FiDownload,
  FiFileText,
  FiHome,
  FiUser,
} from 'react-icons/fi';
import { API_BASE_URL } from '../../config/global';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import {
  BusinessLineLabels,
  ClientStageLabels,
  ClientStatusLabels,
  ClientTypeLabels,
  InterestZoneLabels,
} from '../../views/clients/enums/clientEnums';
import { contractStateLabels } from '../../views/contracts/helpers/contracts.helpers';
import {
  PropertyStatusLabels,
  PropertyTypeLabels,
  PropertyZoneLabels,
} from '../../views/properties/enums/propertyCatalogs';
import { ASSISTANT_ACTIONS } from './assistant.types';
import type { AssistantExecutionResult } from './assistant.types';

/** Registro genérico devuelto por un dominio del CRM. */
type Registro = Record<string, unknown>;

/**
 * Catálogos del CRM con los que se traducen los valores técnicos que devuelve
 * la API (`en_reforma`, `psi`, `lead`…) a las mismas etiquetas de negocio que
 * ve la persona usuaria en el resto de la aplicación.
 */
const CATALOGOS: Record<string, string>[] = [
  ClientTypeLabels,
  ClientStageLabels,
  ClientStatusLabels,
  BusinessLineLabels,
  InterestZoneLabels,
  PropertyStatusLabels,
  PropertyTypeLabels,
  PropertyZoneLabels,
  contractStateLabels,
];

/** Sección del CRM a la que lleva cada acción del asistente. */
const SECCION_DE_ACCION: Record<string, string> = {
  [ASSISTANT_ACTIONS.CREAR_CLIENTE]: '/clientes',
  [ASSISTANT_ACTIONS.BUSCAR_CLIENTES]: '/clientes',
  [ASSISTANT_ACTIONS.MOVER_ETAPA_CLIENTE]: '/clientes',
  [ASSISTANT_ACTIONS.BUSCAR_INMUEBLES]: '/propiedades',
  [ASSISTANT_ACTIONS.CREAR_INMUEBLE]: '/propiedades',
  [ASSISTANT_ACTIONS.GENERAR_CONTRATO]: '/contratos',
  [ASSISTANT_ACTIONS.CONTRATOS_POR_ESTADO]: '/contratos',
  [ASSISTANT_ACTIONS.FIRMAS_PENDIENTES]: '/contratos',
};

/** Campos donde puede venir la ruta del PDF de un contrato. */
const CAMPOS_PDF = [
  'pdfUrl',
  'urlPdf',
  'rutaPdf',
  'pdfPath',
  'pdf',
  'url',
  'ruta',
  'path',
  'archivo',
  'fichero',
  'filePath',
  'fileUrl',
];

/** Campos que sirven de título de un registro, por orden de preferencia. */
const CAMPOS_TITULO = [
  'nombreCompleto',
  'razonSocial',
  'titulo',
  'direccion',
  'referencia',
  'concepto',
  'descripcion',
  'nombre',
  'asunto',
];

/** Campos secundarios que enriquecen la ficha, en orden de aparición. */
const CAMPOS_DETALLE = [
  'email',
  'telefono',
  'poblacion',
  'provincia',
  'tipo',
  'etapa',
  'lineaNegocio',
  'estado',
  'superficie',
  'habitaciones',
];

/** Campos de fecha relevantes para vencimientos y firmas. */
const CAMPOS_FECHA = [
  'fechaVencimiento',
  'vencimiento',
  'fechaFirma',
  'fechaFin',
  'fecha',
];

const esRegistro = (valor: unknown): valor is Registro =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

const textoDe = (valor: unknown): string | null => {
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  if (typeof valor === 'number' && Number.isFinite(valor)) return String(valor);
  return null;
};

/**
 * Normaliza la carga útil del resultado a una lista de registros.
 * El endpoint de comando la entrega en `data`; el historial, ya resumida en
 * `elementos` / `elemento`.
 */
const extraerRegistros = (
  resultado: AssistantExecutionResult | null,
): Registro[] => {
  if (!resultado) return [];

  const candidatos: unknown[] = [
    resultado.data,
    resultado.elementos,
    resultado.elemento,
  ];

  for (const candidato of candidatos) {
    if (Array.isArray(candidato)) {
      return candidato.filter(esRegistro);
    }
    if (esRegistro(candidato)) {
      // Algunos dominios envuelven el listado en `{ data, metadata }`.
      if (Array.isArray(candidato.data)) {
        return candidato.data.filter(esRegistro);
      }
      return [candidato];
    }
  }

  return [];
};

/** Busca en el registro una ruta descargable del contrato generado. */
const buscarEnlacePdf = (registro: Registro): string | null => {
  for (const campo of CAMPOS_PDF) {
    const valor = textoDe(registro[campo]);
    if (!valor) continue;

    if (/^https?:\/\//i.test(valor)) return valor;

    // Ruta relativa servida por la API.
    if (valor.startsWith('/')) return `${API_BASE_URL}${valor}`;
    if (/\.(pdf|docx?)$/i.test(valor)) {
      return `${API_BASE_URL}/${valor.replace(/^\.?\//, '')}`;
    }
  }
  return null;
};

/** Compone el título legible de un registro. */
const tituloDe = (registro: Registro): string => {
  const nombre = textoDe(registro.nombre);
  const apellidos = textoDe(registro.apellidos);
  if (nombre && apellidos) return `${nombre} ${apellidos}`;

  for (const campo of CAMPOS_TITULO) {
    const valor = textoDe(registro[campo]);
    if (valor) return valor;
  }

  const id = textoDe(registro.id);
  return id ? `Registro #${id}` : 'Registro';
};

/**
 * Traduce un valor de catálogo a su etiqueta de negocio.
 * Si ningún catálogo lo reconoce, al menos se le quitan los guiones bajos y se
 * escribe en mayúscula inicial, para no enseñar nunca la clave técnica en crudo.
 */
const etiquetaDeValor = (valor: string): string => {
  for (const catalogo of CATALOGOS) {
    const etiqueta = catalogo[valor];
    if (etiqueta) return etiqueta;
  }

  const legible = valor.replace(/_/g, ' ').trim();
  return legible.charAt(0).toUpperCase() + legible.slice(1);
};

/** Compone la línea de detalle de un registro, ya con etiquetas humanas. */
const detallesDe = (registro: Registro): string[] => {
  const detalles: string[] = [];

  for (const clave of CAMPOS_DETALLE) {
    const valor = textoDe(registro[clave]);
    if (!valor) continue;

    if (clave === 'superficie') detalles.push(`${valor} m²`);
    else if (clave === 'habitaciones') detalles.push(`${valor} hab.`);
    else if (clave === 'email' || clave === 'telefono') detalles.push(valor);
    else if (clave === 'poblacion' || clave === 'provincia') detalles.push(valor);
    else detalles.push(etiquetaDeValor(valor));
  }

  for (const campo of CAMPOS_FECHA) {
    const valor = textoDe(registro[campo]);
    if (valor) {
      detalles.push(formatDate(valor));
      break;
    }
  }

  return detalles.slice(0, 4);
};

/**
 * Enlace a la ficha del registro dentro del CRM.
 *
 * La sección sale de la acción que ejecutó el asistente y el `id`, del propio
 * registro: `#/clientes?id=30` abre el listado ya centrado en ese cliente.
 */
const enlaceDe = (accion: string | null, registro: Registro): string | null => {
  const seccion = accion ? SECCION_DE_ACCION[accion] : null;
  if (!seccion) return null;

  const id = textoDe(registro.id);
  return id && /^\d+$/.test(id) ? `${seccion}?id=${id}` : null;
};

/** Icono acorde a la acción ejecutada. */
/**
 * Icono de la cabecera del resultado.
 *
 * Devuelve JSX ya montado en vez del tipo del componente: asignar un componente
 * a una variable durante el render hace que React lo trate como un tipo nuevo
 * en cada pasada y remonte el subarbol.
 */
const pintarIconoDeAccion = (accion: string | null) => {
  const clase = 'w-4 h-4 text-blue-700 flex-shrink-0';
  switch (accion) {
    case ASSISTANT_ACTIONS.CREAR_CLIENTE:
    case ASSISTANT_ACTIONS.BUSCAR_CLIENTES:
    case ASSISTANT_ACTIONS.MOVER_ETAPA_CLIENTE:
      return <FiUser className={clase} />;
    case ASSISTANT_ACTIONS.BUSCAR_INMUEBLES:
    case ASSISTANT_ACTIONS.CREAR_INMUEBLE:
      return <FiHome className={clase} />;
    default:
      return <FiFileText className={clase} />;
  }
};

interface ResultCardProps {
  accion: string | null;
  resultado: AssistantExecutionResult | null;
}

/** Máximo de registros que se listan en la tarjeta. */
const MAX_VISIBLES = 5;

/**
 * Tarjeta enriquecida del resultado de una acción: mini-lista de clientes o
 * inmuebles, enlace al PDF de un contrato, o aviso del motivo del fallo.
 */
export const ResultCard = ({ accion, resultado }: ResultCardProps) => {
  if (!resultado) return null;

  // Acción fallida: se muestra el motivo, que ya viene redactado en español.
  if (!resultado.ok) {
    return (
      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/50 backdrop-blur-md px-3.5 py-2.5">
        <FiAlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-900">
          {resultado.mensaje || 'La acción no se ha podido completar.'}
        </p>
      </div>
    );
  }

  const registros = extraerRegistros(resultado);

  const enlacePdf =
    accion === ASSISTANT_ACTIONS.GENERAR_CONTRATO
      ? registros.map(buscarEnlacePdf).find(Boolean) ?? null
      : null;

  const total = resultado.total ?? registros.length;

  // Sin carga útil que enseñar: basta con la confirmación del asistente.
  if (!registros.length && !enlacePdf) {
    return (
      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-emerald-200/70 bg-emerald-50/50 backdrop-blur-md px-3.5 py-2.5">
        <FiCheckCircle className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-emerald-900">
          {resultado.mensaje || 'Acción completada.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-white/40 bg-white/35 backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-white/40 bg-white/25">
        <div className="flex items-center gap-2 min-w-0">
          {pintarIconoDeAccion(accion)}
          <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider whitespace-nowrap select-none">
            Resultado
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs font-semibold text-blue-800 bg-blue-100/70 rounded-full px-2 py-0.5 select-none flex-shrink-0">
            {total} {total === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </div>

      {enlacePdf && (
        <div className="px-3.5 py-3 border-b border-white/40">
          <a
            href={enlacePdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3.5 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
          >
            <FiDownload className="w-4 h-4" />
            Abrir el contrato
          </a>
        </div>
      )}

      {registros.length > 0 && (
        <ul className="divide-y divide-white/40">
          {registros.slice(0, MAX_VISIBLES).map((registro, indice) => {
            const detalles = detallesDe(registro);
            const precio =
              typeof registro.precio === 'number'
                ? formatCurrency(registro.precio)
                : typeof registro.importe === 'number'
                  ? formatCurrency(registro.importe)
                  : null;
            const enlace = enlaceDe(accion, registro);

            // En móvil el nombre necesita la fila entera: con el importe al lado
            // se quedaba en cuatro caracteres y no había forma de saber de qué
            // registro hablaba el asistente.
            const contenido = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 break-words">
                    {tituloDe(registro)}
                  </p>
                  {detalles.length > 0 && (
                    <p className="text-xs text-gray-600 break-words">
                      {detalles.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {precio && (
                    <span className="text-sm font-semibold text-blue-800 whitespace-nowrap">
                      {precio}
                    </span>
                  )}
                  {enlace && (
                    <FiChevronRight className="w-4 h-4 text-blue-700" />
                  )}
                </div>
              </>
            );

            return (
              <li key={textoDe(registro.id) ?? indice}>
                {enlace ? (
                  <Link
                    to={enlace}
                    title="Abrir la ficha en el CRM"
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 px-3.5 py-2.5 hover:bg-white/30 transition-colors cursor-pointer"
                  >
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 px-3.5 py-2.5">
                    {contenido}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {registros.length > MAX_VISIBLES && (
        <p className="px-3.5 py-2 text-xs text-gray-600 border-t border-white/40 select-none">
          Y {registros.length - MAX_VISIBLES} más. Consulta el listado completo
          en su sección.
        </p>
      )}
    </div>
  );
};
