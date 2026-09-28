import {
  BusinessLine,
  ClientActivityType,
  ClientStage,
  ClientStatus,
  ClientType,
  InterestZone,
  OperationType,
} from '../../clients/enums';

/** Apunte del historial que acompana a un cliente de demostracion. */
export interface IDemoActivity {
  tipo: ClientActivityType;
  descripcion: string;
  /** Dias hacia atras desde hoy en los que ocurrio el apunte. */
  hace: number;
}

/** Cliente de demostracion, con su historial. */
export interface IDemoClient {
  /** Clave interna para referenciarlo desde inmuebles, contratos y facturas. */
  ref: string;
  nombre: string;
  apellidos?: string;
  email: string;
  telefono: string;
  documento: string;
  tipo: ClientType;
  lineaNegocio: BusinessLine;
  etapa: ClientStage;
  presupuestoMin?: number;
  presupuestoMax?: number;
  zonasInteres: InterestZone[];
  tipoOperacion?: OperationType;
  origen: string;
  notas: string;
  estado?: ClientStatus;
  motivoDescarte?: string;
  /** Antiguedad del alta, en dias. */
  altaHace: number;
  /** Direccion fiscal, usada al facturar. */
  direccionFiscal?: string;
  actividades: IDemoActivity[];
}

/**
 * Doce clientes de demostracion repartidos por las tres lineas de negocio de
 * Vantia y por todas las fases del embudo.
 *
 * TODO es inventado: personas, empresas, documentos de identidad, telefonos y
 * direcciones. Se ha cuidado unicamente que el formato sea valido (letra de
 * control correcta en los NIF, telefonos con prefijo espanol) y que los
 * importes sean coherentes entre si, para que el panel y los informes se vean
 * como se verian con datos de verdad.
 */
export const DEMO_CLIENTS: IDemoClient[] = [
  // =========================================================================
  // PSI para inversores
  // =========================================================================
  {
    ref: 'aranda',
    nombre: 'Álvaro',
    apellidos: 'Aranda Nieto',
    email: 'alvaro.aranda@example.com',
    telefono: '+34 600 000 001',
    documento: '00000001R',
    tipo: ClientType.INVERSOR,
    lineaNegocio: BusinessLine.PSI,
    etapa: ClientStage.BUSQUEDA,
    presupuestoMin: 120000,
    presupuestoMax: 180000,
    zonasInteres: [InterestZone.MARALTA, InterestZone.ALBAMAR],
    tipoOperacion: OperationType.COMPRA_INVERSION,
    origen: 'Referido de cliente',
    notas:
      'Busca dos pisos para alquilar a estudiantes. Prioriza rentabilidad sobre reforma; acepta obra ligera.',
    altaHace: 62,
    direccionFiscal: 'Calle de los Naranjos, 12, 00210 Maralta (Marenza)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta del cliente en el CRM tras el primer contacto telefónico.',
        hace: 62,
      },
      {
        tipo: ClientActivityType.REUNION,
        descripcion:
          'Briefing en oficina: perfil inversor definido, dos operaciones en Maralta o Albamar.',
        hace: 55,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movido de «Briefing» a «Búsqueda» tras firmar el encargo.',
        hace: 41,
      },
      {
        tipo: ClientActivityType.VISITA,
        descripcion:
          'Visita al piso de la calle de los Almendros: le encaja, pide estudio de rentabilidad.',
        hace: 6,
      },
    ],
  },
  {
    ref: 'bermejo',
    nombre: 'Marta',
    apellidos: 'Bermejo Salas',
    email: 'marta.bermejo@example.com',
    telefono: '+34 600 000 002',
    documento: '00000002W',
    tipo: ClientType.INVERSOR,
    lineaNegocio: BusinessLine.PSI,
    etapa: ClientStage.LEAD,
    presupuestoMin: 70000,
    presupuestoMax: 110000,
    zonasInteres: [InterestZone.RIBAVERDE],
    tipoOperacion: OperationType.COMPRA_INVERSION,
    origen: 'Portal inmobiliario (un portal inmobiliario)',
    notas:
      'Primera inversión. Pide acompañamiento en la financiación; pendiente de confirmar hipoteca.',
    altaHace: 21,
    direccionFiscal: 'Avenida del Mar, 44, 00230 Ribaverde (Marenza)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta desde el formulario de la web tras consultar un anuncio.',
        hace: 21,
      },
      {
        tipo: ClientActivityType.LLAMADA,
        descripcion:
          'Llamada de cualificación: presupuesto 70.000-110.000 €, zona Ribaverde, sin prisa.',
        hace: 12,
      },
    ],
  },
  {
    ref: 'cifuentes',
    nombre: 'Javier',
    apellidos: 'Cifuentes Olmo',
    email: 'javier.cifuentes@example.com',
    telefono: '+34 600 000 003',
    documento: '00000003A',
    tipo: ClientType.INVERSOR,
    lineaNegocio: BusinessLine.PSI,
    etapa: ClientStage.BRIEFING,
    presupuestoMin: 90000,
    presupuestoMax: 140000,
    zonasInteres: [InterestZone.ALTABRIA, InterestZone.SERRANOVA],
    tipoOperacion: OperationType.COMPRA_INVERSION,
    origen: 'Campaña de LinkedIn',
    notas:
      'Ya tiene dos inmuebles en Altabria. Quiere ampliar cartera con piso a reformar y revender.',
    altaHace: 34,
    direccionFiscal: 'Calle del Norte, 88, 00110 Altabria (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta tras responder a la campaña de captación de inversores.',
        hace: 34,
      },
      {
        tipo: ClientActivityType.EMAIL,
        descripcion: 'Enviado el dossier de servicios y la propuesta de honorarios.',
        hace: 9,
      },
    ],
  },
  {
    ref: 'duarte',
    nombre: 'Nuria',
    apellidos: 'Duarte Ibáñez',
    email: 'nuria.duarte@example.com',
    telefono: '+34 600 000 004',
    documento: '00000004G',
    tipo: ClientType.INVERSOR,
    lineaNegocio: BusinessLine.PSI,
    etapa: ClientStage.CONTRATO_FIRMADO,
    presupuestoMin: 150000,
    presupuestoMax: 220000,
    zonasInteres: [InterestZone.VALDEMOR],
    tipoOperacion: OperationType.COMPRA_INVERSION,
    origen: 'Referido de gestoría',
    notas:
      'Encargo de búsqueda firmado. Quiere piso de 3 o 4 habitaciones con ascensor cerca del centro.',
    altaHace: 48,
    direccionFiscal: 'Calle de la Fuente, 27, 3.º 2.ª, 00120 Valdemor (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta derivada por la gestoría que lleva su sociedad patrimonial.',
        hace: 48,
      },
      {
        tipo: ClientActivityType.REUNION,
        descripcion: 'Briefing completo y presentación del mandato de búsqueda.',
        hace: 40,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movida a «Contrato firmado»: mandato PSI firmado y primer pago emitido.',
        hace: 31,
      },
      {
        tipo: ClientActivityType.WHATSAPP,
        descripcion: 'Confirmada la visita a dos pisos del centro de Valdemor para el viernes.',
        hace: 3,
      },
    ],
  },
  {
    ref: 'escalante',
    nombre: 'Ignacio',
    apellidos: 'Escalante Puig',
    email: 'ignacio.escalante@example.com',
    telefono: '+34 600 000 005',
    documento: '00000005M',
    tipo: ClientType.INVERSOR,
    lineaNegocio: BusinessLine.PSI,
    etapa: ClientStage.ARRAS,
    presupuestoMin: 200000,
    presupuestoMax: 260000,
    zonasInteres: [InterestZone.ALTABRIA, InterestZone.SERRANOVA],
    tipoOperacion: OperationType.COMPRA_INVERSION,
    origen: 'Referido de cliente',
    notas:
      'Arras firmadas sobre la casa de Serranova. Notaría prevista para dentro de seis semanas.',
    altaHace: 96,
    direccionFiscal: 'Paseo de los Tilos, 5, 00130 Serranova (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta del cliente tras recomendación de Rocío Fuentes.',
        hace: 96,
      },
      {
        tipo: ClientActivityType.VISITA,
        descripcion: 'Segunda visita a la casa de Serranova con el arquitecto técnico.',
        hace: 22,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movido a «Arras» tras aceptar el vendedor la oferta de 318.000 €.',
        hace: 9,
      },
      {
        tipo: ClientActivityType.LLAMADA,
        descripcion: 'Llamada para revisar la nota simple y el reparto de gastos de notaría.',
        hace: 2,
      },
    ],
  },
  {
    ref: 'fuentes',
    nombre: 'Rocío',
    apellidos: 'Fuentes Arcos',
    email: 'rocio.fuentes@example.com',
    telefono: '+34 600 000 006',
    documento: '00000006Y',
    tipo: ClientType.INVERSOR,
    lineaNegocio: BusinessLine.PSI,
    etapa: ClientStage.NOTARIA,
    presupuestoMin: 260000,
    presupuestoMax: 340000,
    zonasInteres: [InterestZone.VALDEMOR, InterestZone.PUENTEALBA],
    tipoOperacion: OperationType.COMPRA_INVERSION,
    origen: 'Web corporativa',
    notas:
      'Compra para alquiler de larga estancia. Firma de escritura cerrada con la notaría de Valdemor.',
    altaHace: 131,
    direccionFiscal: 'Avenida del Parque, 55, 2.º 1.ª, 00140 Puentealba (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta a través del formulario de la web corporativa.',
        hace: 131,
      },
      {
        tipo: ClientActivityType.REUNION,
        descripcion: 'Briefing y firma del encargo de búsqueda.',
        hace: 118,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movida a «Notaría»: fecha de escritura confirmada.',
        hace: 8,
      },
      {
        tipo: ClientActivityType.EMAIL,
        descripcion: 'Enviada la provisión de fondos y el desglose de gastos de la compraventa.',
        hace: 1,
      },
    ],
  },

  // =========================================================================
  // Alquiler temporal a empresas
  // =========================================================================
  {
    ref: 'orion',
    nombre: 'Construcciones Orión Norte, S.L.',
    email: 'administracion@orionnorte.example',
    telefono: '+34 600 000 007',
    documento: 'B00000001',
    tipo: ClientType.EMPRESA,
    lineaNegocio: BusinessLine.ALQUILER_EMPRESAS,
    etapa: ClientStage.ESTANCIA,
    zonasInteres: [InterestZone.MARALTA],
    tipoOperacion: OperationType.ALQUILER_TEMPORAL,
    origen: 'Referido de constructora',
    notas:
      'Alojan a tres técnicos de obra durante la ampliación de la planta cerámica. Renovación anual.',
    altaHace: 212,
    direccionFiscal: 'Polígono Industrial Norte, nave 14, 00231 Albamar',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta de la empresa como cliente de alquiler temporal.',
        hace: 212,
      },
      {
        tipo: ClientActivityType.DOCUMENTO,
        descripcion: 'Recibida la documentación fiscal y el poder del administrador.',
        hace: 198,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movida a «Estancia»: check-in realizado con los tres técnicos.',
        hace: 160,
      },
      {
        tipo: ClientActivityType.LLAMADA,
        descripcion:
          'Consultan por la prórroga del contrato: la obra se alargará hasta final de año.',
        hace: 4,
      },
    ],
  },
  {
    ref: 'pentia',
    nombre: 'Ingeniería Pentia, S.L.',
    email: 'contratacion@pentia.example',
    telefono: '+34 600 000 008',
    documento: 'B00000002',
    tipo: ClientType.EMPRESA,
    lineaNegocio: BusinessLine.ALQUILER_EMPRESAS,
    etapa: ClientStage.CONTRATO,
    zonasInteres: [InterestZone.ALBAMAR, InterestZone.RIBAVERDE],
    tipoOperacion: OperationType.ALQUILER_TEMPORAL,
    origen: 'Feria del sector',
    notas:
      'Necesitan dos plazas para ingenieros desplazados seis meses. Contrato enviado a firma.',
    altaHace: 39,
    direccionFiscal: 'Calle de la Industria, 210, 00121 Altabria',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta tras el contacto en la feria del sector inmobiliario.',
        hace: 39,
      },
      {
        tipo: ClientActivityType.EMAIL,
        descripcion: 'Enviada la propuesta económica para dos plazas durante seis meses.',
        hace: 18,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movida a «Contrato»: aceptan la propuesta y piden el contrato definitivo.',
        hace: 7,
      },
      {
        tipo: ClientActivityType.WHATSAPP,
        descripcion: 'Recordatorio de que el contrato está pendiente de firma.',
        hace: 5,
      },
    ],
  },
  {
    ref: 'quilate',
    nombre: 'Talleres Quilate, S.L.',
    email: 'gerencia@quilate.example',
    telefono: '+34 600 000 009',
    documento: 'B00000003',
    tipo: ClientType.EMPRESA,
    lineaNegocio: BusinessLine.ALQUILER_EMPRESAS,
    etapa: ClientStage.INTERESADA,
    zonasInteres: [InterestZone.RIBAVERDE],
    tipoOperacion: OperationType.ALQUILER_TEMPORAL,
    origen: 'Llamada entrante',
    notas: 'Solicitaban alojamiento para dos operarios, pero han aplazado la contratación.',
    estado: ClientStatus.DESCARTADO,
    motivoDescarte:
      'Aplazan el desplazamiento de los operarios a la próxima campaña; volver a contactar en tres meses.',
    altaHace: 74,
    direccionFiscal: 'Camí d\'Onda, 31, 00230 Ribaverde (Marenza)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta tras llamada entrante solicitando alojamiento para dos operarios.',
        hace: 74,
      },
      {
        tipo: ClientActivityType.LLAMADA,
        descripcion: 'Informan de que aplazan el desplazamiento a la próxima campaña.',
        hace: 30,
      },
      {
        tipo: ClientActivityType.DESCARTE,
        descripcion:
          'Cliente descartado: aplazan el desplazamiento. Volver a contactar en tres meses.',
        hace: 29,
      },
    ],
  },

  // =========================================================================
  // Seguimiento de reformas
  // =========================================================================
  {
    ref: 'herrera',
    nombre: 'Pilar',
    apellidos: 'Herrera Mota',
    email: 'pilar.herrera@example.com',
    telefono: '+34 600 000 010',
    documento: '00000007F',
    tipo: ClientType.PARTICULAR,
    lineaNegocio: BusinessLine.REFORMAS,
    etapa: ClientStage.PRESUPUESTO,
    presupuestoMin: 28000,
    presupuestoMax: 42000,
    zonasInteres: [InterestZone.ALTABRIA],
    tipoOperacion: OperationType.REFORMA_INTEGRAL,
    origen: 'Referido de cliente',
    notas:
      'Reforma integral de piso heredado en Altabria: cocina, dos baños e instalación eléctrica.',
    altaHace: 56,
    direccionFiscal: 'Calle del Olivo, 42, 4.º 1.ª, 00110 Altabria (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta para el seguimiento de la reforma del piso heredado.',
        hace: 56,
      },
      {
        tipo: ClientActivityType.VISITA,
        descripcion: 'Visita técnica con el industrial para tomar medidas y ver instalaciones.',
        hace: 24,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movida a «Presupuesto»: entregado el presupuesto cerrado de 38.400 €.',
        hace: 11,
      },
      {
        tipo: ClientActivityType.LLAMADA,
        descripcion: 'Pide desglosar el capítulo de carpintería antes de aceptar.',
        hace: 6,
      },
    ],
  },
  {
    ref: 'ibarra',
    nombre: 'Sergio',
    apellidos: 'Ibarra Coll',
    email: 'sergio.ibarra@example.com',
    telefono: '+34 600 000 011',
    documento: '00000008P',
    tipo: ClientType.PARTICULAR,
    lineaNegocio: BusinessLine.REFORMAS,
    etapa: ClientStage.EN_OBRA,
    presupuestoMin: 45000,
    presupuestoMax: 60000,
    zonasInteres: [InterestZone.SERRANOVA],
    tipoOperacion: OperationType.REFORMA_INTEGRAL,
    origen: 'Referido de arquitecto',
    notas:
      'Obra en marcha en Serranova. Fase de albañilería terminada; instalaciones esta semana.',
    altaHace: 121,
    direccionFiscal: 'Calle del Molino, 9, 00130 Serranova (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta derivada por el arquitecto que redacta el proyecto.',
        hace: 121,
      },
      {
        tipo: ClientActivityType.CAMBIO_ETAPA,
        descripcion: 'Movido a «En obra»: inicio de los trabajos de demolición.',
        hace: 63,
      },
      {
        tipo: ClientActivityType.VISITA,
        descripcion: 'Visita de obra semanal: albañilería terminada, sin desviación de plazos.',
        hace: 2,
      },
    ],
  },
  {
    ref: 'jordana',
    nombre: 'Elena',
    apellidos: 'Jordana Rivas',
    email: 'elena.jordana@example.com',
    telefono: '+34 600 000 012',
    documento: '00000009D',
    tipo: ClientType.PARTICULAR,
    lineaNegocio: BusinessLine.REFORMAS,
    etapa: ClientStage.PREVISTA,
    presupuestoMin: 18000,
    presupuestoMax: 26000,
    zonasInteres: [InterestZone.PUENTEALBA],
    tipoOperacion: OperationType.REFORMA_INTEGRAL,
    origen: 'Instagram',
    notas: 'Reforma de baño y cocina para poner el piso en alquiler. Pendiente de visita técnica.',
    altaHace: 15,
    direccionFiscal: 'Calle de las Acacias, 18, 00140 Puentealba (Nortia)',
    actividades: [
      {
        tipo: ClientActivityType.ALTA,
        descripcion: 'Alta tras mensaje directo en Instagram pidiendo presupuesto.',
        hace: 15,
      },
      {
        tipo: ClientActivityType.WHATSAPP,
        descripcion: 'Envía fotos del baño y la cocina; queda pendiente cerrar la visita técnica.',
        hace: 8,
      },
    ],
  },
];
