import { ContractFieldType } from '../enums/contract-field-type.enum';
import { IContractTemplateField } from '../interfaces/contract-template-field.interface';

/** Semilla de una plantilla: describe el .docx y todos sus marcadores. */
export interface IContractTemplateSeed {
  key: string;
  nombre: string;
  descripcion: string;
  archivo: string;
  categoria: string;
  icono: string;
  orden: number;
  admiteProrroga?: boolean;
  plantillaProrroga?: string;
  campos: IContractTemplateField[];
}

// ---------------------------------------------------------------------------
// Bloques de campos reutilizados entre plantillas
// ---------------------------------------------------------------------------

const GRUPO_FECHA = 'Fecha del documento';
const GRUPO_ARRENDATARIO = 'Arrendatario (empresa)';
const GRUPO_ARRENDADOR = 'Arrendador (propiedad)';
const GRUPO_INMUEBLE = 'Inmueble y temporada';
const GRUPO_ECONOMICO = 'Condiciones economicas';

/** Dia / mes / anio del encabezado «En Altabria, a ... de ... de ...». */
const camposFecha = (): IContractTemplateField[] => [
  {
    name: 'diaContrato',
    label: 'Día',
    type: ContractFieldType.TEXTO,
    group: GRUPO_FECHA,
    required: true,
    placeholder: '11',
  },
  {
    name: 'mesContrato',
    label: 'Mes',
    type: ContractFieldType.TEXTO,
    group: GRUPO_FECHA,
    required: true,
    placeholder: 'agosto',
  },
  {
    name: 'anioContrato',
    label: 'Año',
    type: ContractFieldType.TEXTO,
    group: GRUPO_FECHA,
    required: true,
    placeholder: '2026',
  },
];

/** Datos de la empresa arrendataria y de su administrador. */
const camposArrendatario = (): IContractTemplateField[] => [
  {
    name: 'arrendatarioRazonSocial',
    label: 'Razón social de la empresa',
    type: ContractFieldType.TEXTO,
    group: GRUPO_ARRENDATARIO,
    required: true,
    span: 2,
    placeholder: 'Construcciones Orión Norte, S.L.',
  },
  {
    name: 'arrendatarioCif',
    label: 'CIF de la empresa',
    type: ContractFieldType.DOCUMENTO,
    group: GRUPO_ARRENDATARIO,
    required: true,
    placeholder: 'B12345678',
  },
  {
    name: 'arrendatarioDomicilio',
    label: 'Domicilio social',
    type: ContractFieldType.TEXTO,
    group: GRUPO_ARRENDATARIO,
    required: true,
    span: 2,
  },
  {
    name: 'arrendatarioAdministrador',
    label: 'Administrador que firma',
    type: ContractFieldType.TEXTO,
    group: GRUPO_ARRENDATARIO,
    required: true,
  },
  {
    name: 'arrendatarioAdministradorDni',
    label: 'DNI del administrador',
    type: ContractFieldType.DOCUMENTO,
    group: GRUPO_ARRENDATARIO,
    required: true,
  },
  {
    name: 'arrendatarioAdministradorDomicilio',
    label: 'Domicilio del administrador',
    type: ContractFieldType.TEXTO,
    group: GRUPO_ARRENDATARIO,
    span: 2,
  },
];

/** Datos del arrendador (la propiedad). */
const camposArrendador = (): IContractTemplateField[] => [
  {
    name: 'arrendadorNombre',
    label: 'Nombre del arrendador',
    type: ContractFieldType.TEXTO,
    group: GRUPO_ARRENDADOR,
    required: true,
    span: 2,
  },
  {
    name: 'arrendadorDni',
    label: 'DNI del arrendador',
    type: ContractFieldType.DOCUMENTO,
    group: GRUPO_ARRENDADOR,
    required: true,
  },
  {
    name: 'arrendadorDomicilio',
    label: 'Domicilio del arrendador',
    type: ContractFieldType.TEXTO,
    group: GRUPO_ARRENDADOR,
    required: true,
    span: 2,
  },
];

// ---------------------------------------------------------------------------
// Catalogo de plantillas
// ---------------------------------------------------------------------------

export const CONTRACT_TEMPLATES_SEED: IContractTemplateSeed[] = [
  // =========================================================================
  // 1. ALQUILER TEMPORAL — la plantilla principal del negocio
  // =========================================================================
  {
    key: 'alquiler-temporal',
    nombre: 'Contrato de alquiler de temporada',
    descripcion:
      'Arrendamiento de uso distinto de vivienda en régimen de temporada para empresas que alojan a sus trabajadores.',
    archivo: 'alquiler-temporal.docx',
    categoria: 'Alquiler temporal',
    icono: 'FiHome',
    orden: 1,
    admiteProrroga: true,
    plantillaProrroga: 'prorroga',
    campos: [
      ...camposFecha(),
      ...camposArrendatario(),
      {
        name: 'arrendatarioEmail',
        label: 'Correo del arrendatario',
        type: ContractFieldType.EMAIL,
        group: GRUPO_ARRENDATARIO,
        help: 'Dirección designada para las comunicaciones del contrato.',
      },
      {
        name: 'arrendatarioDomicilioNotificaciones',
        label: 'Domicilio a efectos de notificaciones',
        type: ContractFieldType.TEXTO,
        group: GRUPO_ARRENDATARIO,
        span: 2,
      },
      ...camposArrendador(),
      {
        name: 'arrendadorEmail',
        label: 'Correo del arrendador',
        type: ContractFieldType.EMAIL,
        group: GRUPO_ARRENDADOR,
      },
      {
        name: 'direccionInmueble',
        label: 'Dirección del inmueble',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
        span: 2,
        help: 'Finca urbana objeto del arrendamiento.',
      },
      {
        name: 'temporada',
        label: 'Temporada',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        placeholder: 'obra de construcción 2026',
      },
      {
        name: 'duracionContrato',
        label: 'Duración del contrato',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        placeholder: 'doce meses',
      },
      {
        name: 'inicioDia',
        label: 'Inicio · día',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
      },
      {
        name: 'inicioMes',
        label: 'Inicio · mes',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
      },
      {
        name: 'inicioAnio',
        label: 'Inicio · año',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
      },
      {
        name: 'finDia',
        label: 'Fin · día',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
      },
      {
        name: 'finMes',
        label: 'Fin · mes',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
      },
      {
        name: 'finAnio',
        label: 'Fin · año',
        type: ContractFieldType.TEXTO,
        group: GRUPO_INMUEBLE,
        required: true,
      },
      {
        name: 'precioMensualCifra',
        label: 'Renta mensual (€)',
        type: ContractFieldType.MONEDA,
        group: GRUPO_ECONOMICO,
        required: true,
        placeholder: '1.200',
      },
      {
        name: 'precioMensualLetras',
        label: 'Renta mensual en letras',
        type: ContractFieldType.TEXTO,
        group: GRUPO_ECONOMICO,
        span: 2,
        derivedFromAmount: 'precioMensualCifra',
        help: 'Si se deja vacío se calcula automáticamente a partir de la cifra.',
      },
      {
        name: 'diaPago',
        label: 'Día de pago de cada mes',
        type: ContractFieldType.TEXTO,
        group: GRUPO_ECONOMICO,
        placeholder: '5',
      },
      {
        name: 'iban',
        label: 'Cuenta de la arrendadora (IBAN)',
        type: ContractFieldType.IBAN,
        group: GRUPO_ECONOMICO,
        span: 2,
        placeholder: 'ES00 0000 0000 0000 0000 0000',
      },
      {
        name: 'fianzaCifra',
        label: 'Fianza (€)',
        type: ContractFieldType.MONEDA,
        group: GRUPO_ECONOMICO,
        required: true,
        help: 'Importe de un mes de renta (art. 36.1 LAU).',
      },
      {
        name: 'fianzaLetras',
        label: 'Fianza en letras',
        type: ContractFieldType.TEXTO,
        group: GRUPO_ECONOMICO,
        span: 2,
        derivedFromAmount: 'fianzaCifra',
        help: 'Si se deja vacío se calcula automáticamente a partir de la cifra.',
      },
      {
        name: 'responsableDatos',
        label: 'Responsable del tratamiento de datos',
        type: ContractFieldType.TEXTO,
        group: 'Protección de datos',
        span: 2,
        defaultValue: 'Vantia Patrimonio S.L.',
      },
      {
        name: 'ocupantes',
        label: 'Empleados que se alojarán en la vivienda',
        type: ContractFieldType.LISTA,
        group: 'Ocupantes',
        span: 2,
        help: 'Máximo 4 ocupantes: la cláusula cuarta prohíbe la sobreocupación.',
        maxRows: 4,
        subFields: [
          {
            name: 'nombre',
            label: 'Nombre y apellidos',
            type: ContractFieldType.TEXTO,
          },
          { name: 'dni', label: 'DNI / NIE', type: ContractFieldType.DOCUMENTO },
          { name: 'domicilio', label: 'Domicilio', type: ContractFieldType.TEXTO },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. PRORROGA DEL ALQUILER TEMPORAL
  // =========================================================================
  {
    key: 'prorroga',
    nombre: 'Prórroga de alquiler de temporada',
    descripcion:
      'Documento que prorroga un contrato de alquiler de temporada manteniendo las condiciones del original.',
    archivo: 'prorroga.docx',
    categoria: 'Alquiler temporal',
    icono: 'FiRefreshCw',
    orden: 2,
    campos: [
      ...camposFecha(),
      ...camposArrendatario(),
      ...camposArrendador(),
      {
        name: 'direccionInmueble',
        label: 'Dirección del inmueble',
        type: ContractFieldType.TEXTO,
        group: 'Contrato original',
        required: true,
        span: 2,
      },
      {
        name: 'fechaContratoOriginal',
        label: 'Fecha del contrato original',
        type: ContractFieldType.FECHA,
        group: 'Contrato original',
        required: true,
      },
      {
        name: 'fechaFinOriginal',
        label: 'Fecha de vencimiento del original',
        type: ContractFieldType.FECHA,
        group: 'Contrato original',
        required: true,
      },
      {
        name: 'duracionProrroga',
        label: 'Duración de la prórroga',
        type: ContractFieldType.TEXTO,
        group: 'Prórroga',
        required: true,
        placeholder: 'seis meses',
      },
      {
        name: 'fechaFinProrroga',
        label: 'Nueva fecha de vencimiento',
        type: ContractFieldType.FECHA,
        group: 'Prórroga',
        required: true,
      },
    ],
  },

  // =========================================================================
  // 3. ANEXO DE INCORPORACION DE NUEVO INQUILINO
  // =========================================================================
  {
    key: 'anexo-inquilino',
    nombre: 'Anexo · incorporación de nuevo inquilino',
    descripcion:
      'Anexo al contrato de alquiler temporal para dar de alta a un ocupante adicional.',
    archivo: 'anexo-inquilino.docx',
    categoria: 'Alquiler temporal',
    icono: 'FiUserPlus',
    orden: 3,
    campos: [
      ...camposFecha(),
      ...camposArrendador(),
      {
        name: 'direccionInmueble',
        label: 'Dirección del inmueble',
        type: ContractFieldType.TEXTO,
        group: 'Contrato original',
        required: true,
        span: 2,
      },
      {
        name: 'fechaContratoOriginal',
        label: 'Fecha del contrato original',
        type: ContractFieldType.FECHA,
        group: 'Contrato original',
        required: true,
      },
      {
        name: 'inquilino1Nombre',
        label: 'Inquilino actual 1 · nombre',
        type: ContractFieldType.TEXTO,
        group: 'Inquilinos actuales',
      },
      {
        name: 'inquilino1Dni',
        label: 'Inquilino actual 1 · DNI/NIE',
        type: ContractFieldType.DOCUMENTO,
        group: 'Inquilinos actuales',
      },
      {
        name: 'inquilino2Nombre',
        label: 'Inquilino actual 2 · nombre',
        type: ContractFieldType.TEXTO,
        group: 'Inquilinos actuales',
      },
      {
        name: 'inquilino2Dni',
        label: 'Inquilino actual 2 · DNI/NIE',
        type: ContractFieldType.DOCUMENTO,
        group: 'Inquilinos actuales',
      },
      {
        name: 'nuevoInquilinoNombre',
        label: 'Nombre y apellidos',
        type: ContractFieldType.TEXTO,
        group: 'Nuevo inquilino',
        required: true,
        span: 2,
      },
      {
        name: 'nuevoInquilinoDni',
        label: 'DNI / NIE',
        type: ContractFieldType.DOCUMENTO,
        group: 'Nuevo inquilino',
        required: true,
      },
      {
        name: 'nuevoInquilinoDomicilio',
        label: 'Domicilio actual',
        type: ContractFieldType.TEXTO,
        group: 'Nuevo inquilino',
        span: 2,
      },
      {
        name: 'nuevoInquilinoTelefono',
        label: 'Teléfono',
        type: ContractFieldType.TELEFONO,
        group: 'Nuevo inquilino',
      },
      {
        name: 'nuevoInquilinoEmail',
        label: 'Correo electrónico',
        type: ContractFieldType.EMAIL,
        group: 'Nuevo inquilino',
      },
    ],
  },

  // =========================================================================
  // 4. CONTRATO DE PERSONAL SHOPPER INMOBILIARIO (PSI)
  // =========================================================================
  {
    key: 'psi',
    nombre: 'Contrato de personal shopper inmobiliario',
    descripcion:
      'Encargo de búsqueda de vivienda en exclusiva para inversores. Los datos de la agencia (Vantia Patrimonio S.L.) van fijos en la plantilla.',
    archivo: 'psi.docx',
    categoria: 'PSI',
    icono: 'FiSearch',
    orden: 4,
    campos: [
      ...camposFecha(),
      {
        name: 'clienteNombre',
        label: 'Nombre del cliente comprador',
        type: ContractFieldType.TEXTO,
        group: 'Cliente comprador',
        required: true,
        span: 2,
      },
      {
        name: 'clienteDni',
        label: 'DNI del cliente',
        type: ContractFieldType.DOCUMENTO,
        group: 'Cliente comprador',
        required: true,
      },
      {
        name: 'clienteDomicilio',
        label: 'Domicilio del cliente',
        type: ContractFieldType.TEXTO,
        group: 'Cliente comprador',
        required: true,
        span: 2,
      },
      {
        name: 'tipoVivienda',
        label: 'Tipo de vivienda buscada',
        type: ContractFieldType.TEXTO_LARGO,
        group: 'Encargo de búsqueda',
        required: true,
        span: 2,
        placeholder: '2 o 3 habitaciones, con ascensor',
      },
      {
        name: 'ubicacionesBusqueda',
        label: 'Ubicaciones',
        type: ContractFieldType.TEXTO_LARGO,
        group: 'Encargo de búsqueda',
        required: true,
        span: 2,
        placeholder: 'Altabria, Valdemor, Serranova, Puentealba',
      },
      {
        name: 'rangoPrecio',
        label: 'Rango de precio',
        type: ContractFieldType.TEXTO,
        group: 'Encargo de búsqueda',
        required: true,
        span: 2,
        placeholder: 'de 100.000 a 150.000 €',
      },
      {
        name: 'duracionEncargo',
        label: 'Duración del encargo',
        type: ContractFieldType.TEXTO,
        group: 'Encargo de búsqueda',
        defaultValue: '6 meses',
      },
      {
        name: 'honorariosTotales',
        label: 'Honorarios totales',
        type: ContractFieldType.TEXTO,
        group: 'Honorarios',
        defaultValue: '3.000€ + IVA',
      },
      {
        name: 'honorariosPrimerPago',
        label: 'Primer pago (a la firma)',
        type: ContractFieldType.TEXTO,
        group: 'Honorarios',
        defaultValue: '1.500€ + IVA',
      },
      {
        name: 'honorariosSegundoPago',
        label: 'Segundo pago (a la firma de arras)',
        type: ContractFieldType.TEXTO,
        group: 'Honorarios',
        defaultValue: '1.500€ + IVA',
      },
    ],
  },

  // =========================================================================
  // 5. DOCUMENTO DE RESERVA (PAGA Y SENAL)
  // =========================================================================
  {
    key: 'reserva',
    nombre: 'Documento de reserva (paga y señal)',
    descripcion:
      'Reserva de un inmueble en alquiler con entrega de paga y señal a la agencia. Datos bancarios de la agencia fijos.',
    archivo: 'reserva.docx',
    categoria: 'Alquiler temporal',
    icono: 'FiBookmark',
    orden: 5,
    campos: [
      ...camposFecha(),
      {
        name: 'firmanteNombre',
        label: 'Persona que firma',
        type: ContractFieldType.TEXTO,
        group: 'Firmante',
        required: true,
        span: 2,
      },
      {
        name: 'firmanteDni',
        label: 'DNI del firmante',
        type: ContractFieldType.DOCUMENTO,
        group: 'Firmante',
        required: true,
      },
      {
        name: 'firmanteDomicilio',
        label: 'Domicilio del firmante',
        type: ContractFieldType.TEXTO,
        group: 'Firmante',
        span: 2,
      },
      {
        name: 'empresaRazonSocial',
        label: 'Empresa representada',
        type: ContractFieldType.TEXTO,
        group: 'Empresa',
        required: true,
        span: 2,
      },
      {
        name: 'empresaCif',
        label: 'CIF de la empresa',
        type: ContractFieldType.DOCUMENTO,
        group: 'Empresa',
        required: true,
      },
      {
        name: 'empresaDomicilio',
        label: 'Domicilio de la empresa',
        type: ContractFieldType.TEXTO,
        group: 'Empresa',
        span: 2,
      },
      {
        name: 'direccionInmueble',
        label: 'Dirección del inmueble reservado',
        type: ContractFieldType.TEXTO,
        group: 'Reserva',
        required: true,
        span: 2,
      },
      {
        name: 'importeReservaBase',
        label: 'Importe de la reserva sin IVA (€)',
        type: ContractFieldType.MONEDA,
        group: 'Reserva',
        required: true,
      },
      {
        name: 'importeReservaTotal',
        label: 'Importe total con IVA (€)',
        type: ContractFieldType.MONEDA,
        group: 'Reserva',
        required: true,
      },
      {
        name: 'importeReservaLetras',
        label: 'Importe total en letras',
        type: ContractFieldType.TEXTO,
        group: 'Reserva',
        span: 2,
        derivedFromAmount: 'importeReservaTotal',
        help: 'Si se deja vacío se calcula automáticamente a partir de la cifra.',
      },
      {
        name: 'validezHasta',
        label: 'Validez de la reserva hasta',
        type: ContractFieldType.FECHA,
        group: 'Reserva',
        required: true,
      },
      {
        name: 'precioMensualCifra',
        label: 'Renta mensual pactada (€)',
        type: ContractFieldType.MONEDA,
        group: 'Alquiler pactado',
        required: true,
      },
      {
        name: 'precioMensualLetras',
        label: 'Renta mensual en letras',
        type: ContractFieldType.TEXTO,
        group: 'Alquiler pactado',
        span: 2,
        derivedFromAmount: 'precioMensualCifra',
      },
    ],
  },
];
