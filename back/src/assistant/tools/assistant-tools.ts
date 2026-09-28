import {
  ASSISTANT_INTEREST_ZONES,
  AssistantActionName,
  ContractStatus,
} from '../../common/contracts/assistant-actions';
import { INvidiaTool } from '../interfaces/nvidia.interfaces';

/**
 * Catálogo de herramientas (function calling) que se ofrecen al modelo de
 * NVIDIA. Cada herramienta se corresponde 1:1 con un método de las interfaces
 * de `common/contracts/assistant-actions.ts`, de modo que el despacho es
 * directo y no hay acciones que el modelo pueda inventar.
 *
 * Los nombres SIEMPRE salen del enum `AssistantActionName`: es el vocabulario
 * canónico compartido con los módulos de dominio.
 */

/** Etiqueta en español de cada acción, para pintarla en la interfaz. */
export const ASSISTANT_ACTION_LABELS: Record<AssistantActionName, string> = {
  [AssistantActionName.CREAR_CLIENTE]: 'Alta de cliente',
  [AssistantActionName.MOVER_ETAPA_CLIENTE]: 'Cambio de etapa',
  [AssistantActionName.BUSCAR_CLIENTES]: 'Búsqueda de clientes',
  [AssistantActionName.BUSCAR_INMUEBLES]: 'Búsqueda de inmuebles',
  [AssistantActionName.CREAR_INMUEBLE]: 'Alta de inmueble',
  [AssistantActionName.GENERAR_CONTRATO]: 'Generación de contrato',
  [AssistantActionName.CONTRATOS_POR_ESTADO]: 'Contratos por estado',
  [AssistantActionName.FIRMAS_PENDIENTES]: 'Firmas pendientes',
  [AssistantActionName.VENCIMIENTOS_PROXIMOS]: 'Vencimientos próximos',
};

/** Paginación reutilizable en las herramientas de búsqueda. */
const PAGINACION_PROPERTIES = {
  page: {
    type: 'integer',
    minimum: 1,
    description: 'Página solicitada, empezando en 1. Por defecto 1.',
  },
  size: {
    type: 'integer',
    minimum: 1,
    maximum: 50,
    description: 'Número de registros por página. Por defecto 10.',
  },
};

export const ASSISTANT_TOOLS: INvidiaTool[] = [
  {
    type: 'function',
    function: {
      name: AssistantActionName.CREAR_CLIENTE,
      description:
        'Da de alta un cliente nuevo en el CRM. Úsala cuando la persona usuaria dicte los datos de un cliente o lead nuevo ("apunta un cliente nuevo", "da de alta a...").',
      parameters: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            description: 'Nombre de pila o razón social del cliente.',
          },
          apellidos: {
            type: 'string',
            description: 'Apellidos, si es una persona física.',
          },
          email: { type: 'string', description: 'Correo de contacto.' },
          telefono: { type: 'string', description: 'Teléfono de contacto.' },
          documento: { type: 'string', description: 'NIF, CIF o NIE.' },
          lineaNegocio: {
            type: 'string',
            description:
              'Línea de negocio: "PSI para inversores", "alquiler temporal" o "reformas".',
          },
          etapa: {
            type: 'string',
            description:
              'Etapa inicial del pipeline, si la persona usuaria la indica. Si no, se omite.',
          },
          origen: {
            type: 'string',
            description:
              'Origen del lead: web, referido, portal inmobiliario, llamada...',
          },
          presupuestoMin: {
            type: 'number',
            minimum: 0,
            description:
              'Presupuesto mínimo en euros. Si la persona usuaria dice un único importe ("hasta 200.000"), rellena solo presupuestoMax.',
          },
          presupuestoMax: {
            type: 'number',
            minimum: 0,
            description:
              'Presupuesto máximo en euros. Debe ser mayor o igual que presupuestoMin.',
          },
          zonasInteres: {
            type: 'array',
            description:
              'Zonas en las que el cliente quiere operar. Incluye solo las que haya mencionado la persona usuaria, tal cual aparecen en la lista.',
            items: {
              type: 'string',
              enum: [...ASSISTANT_INTEREST_ZONES],
            },
          },
          notas: {
            type: 'string',
            description: 'Notas libres dictadas por la persona usuaria.',
          },
        },
        required: ['nombre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.MOVER_ETAPA_CLIENTE,
      description:
        'Mueve un cliente a otra etapa del pipeline (columna del kanban). Úsala ante órdenes como "pasa a Marta a visita realizada" o "mueve al cliente 12 a cerrado".',
      parameters: {
        type: 'object',
        properties: {
          cliente: {
            type: 'string',
            description:
              'Identificación del cliente: su id numérico o el nombre tal como lo ha dicho la persona usuaria.',
          },
          etapa: {
            type: 'string',
            description:
              'Etapa de destino, tal como la ha dicho la persona usuaria. No la traduzcas ni la inventes.',
          },
        },
        required: ['cliente', 'etapa'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.BUSCAR_CLIENTES,
      description:
        'Busca clientes en el CRM Y DEVUELVE CUÁNTOS HAY. Sirve igual para listar ("enséñame los clientes de alquiler temporal", "busca a los García") que para CONTAR o comprobar si existen: "¿cuántos clientes activos hay en la cartera?", "número de clientes de reformas", "¿hay algún cliente en notaría?". No hay ninguna otra herramienta que cuente clientes. Sin ningún filtro devuelve la cartera de clientes ACTIVOS, que es justo lo que se entiende por "clientes activos" o "clientes en cartera".',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description:
              'Texto libre que se buscará en nombre, apellidos, email, teléfono y documento.',
          },
          etapa: {
            type: 'string',
            description:
              'Etapa concreta del pipeline por la que filtrar: captación, visita realizada, cerrado... "Activo", "activos", "en cartera" o "todos" NO son etapas; en esos casos omite este argumento.',
          },
          lineaNegocio: {
            type: 'string',
            description: 'Línea de negocio por la que filtrar.',
          },
          ...PAGINACION_PROPERTIES,
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.BUSCAR_INMUEBLES,
      description:
        'Busca inmuebles en la cartera Y DEVUELVE CUÁNTOS HAY. Sirve igual para listar ("busca pisos en Altabria por debajo de 200.000", "qué locales tenemos disponibles") que para CONTAR o comprobar si existen: "¿cuántos inmuebles tenemos en cartera?", "¿hay algún inmueble disponible en Valdemor?". No hay ninguna otra herramienta que cuente inmuebles. Sin filtros devuelve la cartera entera.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description:
              'Texto libre que se buscará en referencia, dirección y población.',
          },
          poblacion: { type: 'string', description: 'Población o municipio.' },
          tipo: {
            type: 'string',
            description: 'Tipo de inmueble: piso, local, chalet, nave...',
          },
          estado: {
            type: 'string',
            description:
              'Estado comercial: disponible, reservado, vendido, alquilado...',
          },
          precioMin: {
            type: 'number',
            description: 'Precio mínimo en euros.',
          },
          precioMax: {
            type: 'number',
            description: 'Precio máximo en euros.',
          },
          habitacionesMin: {
            type: 'integer',
            description: 'Número mínimo de habitaciones.',
          },
          ...PAGINACION_PROPERTIES,
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.CREAR_INMUEBLE,
      description:
        'Da de alta un inmueble nuevo en la cartera. Úsala cuando la persona usuaria dicte los datos de una propiedad nueva.',
      parameters: {
        type: 'object',
        properties: {
          referencia: {
            type: 'string',
            description:
              'Referencia interna del inmueble. Omítela si la persona usuaria no la dice.',
          },
          direccion: {
            type: 'string',
            description: 'Dirección completa del inmueble.',
          },
          poblacion: { type: 'string', description: 'Población o municipio.' },
          provincia: { type: 'string', description: 'Provincia.' },
          codigoPostal: { type: 'string', description: 'Código postal.' },
          tipo: {
            type: 'string',
            description: 'Tipo de inmueble: piso, local, chalet, nave...',
          },
          precio: {
            type: 'number',
            description: 'Precio de venta o renta mensual, en euros.',
          },
          superficie: {
            type: 'number',
            description: 'Superficie en metros cuadrados.',
          },
          habitaciones: {
            type: 'integer',
            description: 'Número de habitaciones.',
          },
          estado: { type: 'string', description: 'Estado comercial.' },
          cliente: {
            type: 'string',
            description:
              'Cliente propietario o inversor asociado: id numérico o nombre.',
          },
          notas: { type: 'string', description: 'Notas libres.' },
        },
        required: ['direccion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.GENERAR_CONTRATO,
      description:
        'Genera un contrato a partir de una plantilla rellenando sus campos. Úsala ante órdenes como "prepárame el mandato de Marta" o "genera el contrato de alquiler temporal para la empresa X".',
      parameters: {
        type: 'object',
        properties: {
          plantilla: {
            type: 'string',
            description:
              'Clave de la plantilla de contrato, por ejemplo "mandato-psi" o "alquiler-temporal". Usa la que mencione la persona usuaria.',
          },
          cliente: {
            type: 'string',
            description:
              'Cliente al que se vincula el contrato: id numérico o nombre. Si se indica, los datos del cliente se completan solos.',
          },
          datos: {
            type: 'object',
            description:
              'Pares campo/valor que rellenan los marcadores de la plantilla (importe, duración, dirección...). Incluye solo los que haya dicho la persona usuaria.',
            additionalProperties: true,
          },
        },
        required: ['plantilla'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.CONTRATOS_POR_ESTADO,
      description:
        'Lista los contratos que están en un estado concreto y dice cuántos son. Úsala ante preguntas como "qué contratos hay en borrador", "enséñame los contratos firmados" o "¿cuántos contratos hay anulados?".',
      parameters: {
        type: 'object',
        properties: {
          estado: {
            type: 'string',
            enum: Object.values(ContractStatus),
            description:
              'Estado del contrato: BORRADOR, PENDIENTE_FIRMA, FIRMADO, ANULADO o VENCIDO.',
          },
        },
        required: ['estado'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.FIRMAS_PENDIENTES,
      description:
        'Devuelve los contratos y documentos que siguen a la espera de firma, y cuántos son. Úsala ante preguntas como "qué tengo pendiente de firma", "quién no ha firmado todavía" o "¿cuántos contratos están pendientes de firma?".',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: AssistantActionName.VENCIMIENTOS_PROXIMOS,
      description:
        'Devuelve los vencimientos próximos (contratos, alquileres, hitos de reforma y facturas) dentro de una ventana de días, y cuántos son. Úsala ante preguntas como "qué vence este mes", "qué se me acaba en dos semanas" o "¿cuántos vencimientos tengo este mes?".',
      parameters: {
        type: 'object',
        properties: {
          dias: {
            type: 'integer',
            minimum: 1,
            maximum: 365,
            description:
              'Número de días hacia delante que se consideran. Por defecto 30.',
          },
        },
      },
    },
  },
];

/** Conjunto de nombres válidos, para descartar alucinaciones del modelo. */
export const ASSISTANT_TOOL_NAMES = new Set<string>(
  ASSISTANT_TOOLS.map((tool) => tool.function.name),
);
