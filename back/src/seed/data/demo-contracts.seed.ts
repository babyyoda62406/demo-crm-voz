import { ContractState } from '../../contracts/enums/contract-state.enum';

/** Contrato de demostracion. */
export interface IDemoContract {
  /** Clave interna para referenciarlo desde las facturas. */
  ref: string;
  /** Posicion en el correlativo del ejercicio (`CT-2026-0001`). */
  secuencia: number;
  titulo: string;
  /** Clave de la plantilla registrada en `contracts/seed`. */
  templateKey: string;
  estado: ContractState;
  /** Cliente vinculado (clave `ref` de `DEMO_CLIENTS`). */
  clienteRef: string;
  /** Inmueble vinculado (clave `ref` de `DEMO_PROPERTIES`), si lo hay. */
  propiedadRef?: string;
  /** Antiguedad del documento, en dias. */
  creadoHace: number;
  /** Dias transcurridos desde el envio a firma. */
  enviadoHace?: number;
  /** Dias transcurridos desde que el cliente abrio el enlace. */
  vistoHace?: number;
  /** Dias transcurridos desde la firma. */
  firmadoHace?: number;
  destinatarioEmail?: string;
  firmanteNombre?: string;
  /** Dias desde hoy hasta el inicio de vigencia (negativo: ya empezo). */
  inicioEnDias?: number;
  /** Dias desde hoy hasta el fin de vigencia (positivo: aun no vence). */
  finEnDias?: number;
  /** Valores fijos de la plantilla. Las fechas las completa el servicio. */
  datos: Record<string, string | number | boolean>;
  notas?: string;
}

/**
 * Seis contratos que cubren todo el ciclo de vida documental: uno firmado y a
 * punto de vencer (dispara el aviso de prorroga), dos a la espera de firma
 * (disparan el aviso de seguimiento), un mandato firmado, un borrador sin
 * enviar y uno anulado.
 */
export const DEMO_CONTRACTS: IDemoContract[] = [
  {
    ref: 'alquiler-orion',
    secuencia: 1,
    titulo: 'Alquiler temporal — Construcciones Orión Norte, S.L.',
    templateKey: 'alquiler-temporal',
    estado: ContractState.FIRMADO,
    clienteRef: 'orion',
    propiedadRef: 'maralta-almendros',
    creadoHace: 170,
    enviadoHace: 168,
    vistoHace: 167,
    firmadoHace: 165,
    destinatarioEmail: 'administracion@orionnorte.example',
    firmanteNombre: 'Tomás Olivares Rey',
    inicioEnDias: -160,
    finEnDias: 18,
    datos: {
      arrendatarioRazonSocial: 'Construcciones Orión Norte, S.L.',
      arrendatarioCif: 'B00000001',
      arrendatarioDomicilio: 'Polígono Industrial Norte, nave 14, 00231 Albamar',
      arrendatarioAdministrador: 'Tomás Olivares Rey',
      arrendatarioAdministradorDni: '00000010X',
      arrendatarioEmail: 'administracion@orionnorte.example',
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
      arrendadorDni: 'B00000000',
      arrendadorDomicilio: 'Calle Mayor, 18, 00210 Maralta (Marenza)',
      arrendadorEmail: 'administracion@vantia.example',
      direccionInmueble: 'Calle de los Almendros, 14, 5.º, 00210 Maralta',
      temporada: 'Desplazamiento por obra en planta cerámica',
      duracionContrato: 'seis meses',
      precioMensualCifra: '1.150',
      precioMensualLetras: 'mil ciento cincuenta euros',
      diaPago: '5',
      iban: 'ES00 0000 0000 0000 0000 0000',
      fianzaCifra: '2.300',
      fianzaLetras: 'dos mil trescientos euros',
      responsableDatos: 'Vantia Patrimonio, S.L.',
    },
    notas: 'La empresa ya ha preguntado por la prórroga: la obra se alarga hasta final de año.',
  },
  {
    ref: 'alquiler-pentia',
    secuencia: 2,
    titulo: 'Alquiler temporal — Ingeniería Pentia, S.L.',
    templateKey: 'alquiler-temporal',
    estado: ContractState.ENVIADO,
    clienteRef: 'pentia',
    propiedadRef: 'albamar-ermita',
    creadoHace: 7,
    enviadoHace: 6,
    destinatarioEmail: 'contratacion@pentia.example',
    inicioEnDias: 12,
    finEnDias: 195,
    datos: {
      arrendatarioRazonSocial: 'Ingeniería Pentia, S.L.',
      arrendatarioCif: 'B00000002',
      arrendatarioDomicilio: 'Calle de la Industria, 210, 00121 Altabria',
      arrendatarioAdministrador: 'Lorena Prado Vega',
      arrendatarioAdministradorDni: '00000011B',
      arrendatarioEmail: 'contratacion@pentia.example',
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
      arrendadorDni: 'B00000000',
      arrendadorDomicilio: 'Calle Mayor, 18, 00210 Maralta (Marenza)',
      direccionInmueble: 'Calle de la Ermita, 8, 1.º, 00220 Albamar',
      temporada: 'Desplazamiento técnico de seis meses',
      duracionContrato: 'seis meses',
      precioMensualCifra: '890',
      precioMensualLetras: 'ochocientos noventa euros',
      diaPago: '1',
      iban: 'ES00 0000 0000 0000 0000 0000',
      fianzaCifra: '1.780',
      fianzaLetras: 'mil setecientos ochenta euros',
      responsableDatos: 'Vantia Patrimonio, S.L.',
    },
    notas: 'Enviado a firma. Pendiente de que devuelvan el contrato firmado por el administrador.',
  },
  {
    ref: 'psi-duarte',
    secuencia: 3,
    titulo: 'Encargo de personal shopper inmobiliario — Nuria Duarte Ibáñez',
    templateKey: 'psi',
    estado: ContractState.FIRMADO,
    clienteRef: 'duarte',
    creadoHace: 33,
    enviadoHace: 32,
    vistoHace: 32,
    firmadoHace: 31,
    destinatarioEmail: 'nuria.duarte@example.com',
    firmanteNombre: 'Nuria Duarte Ibáñez',
    datos: {
      clienteNombre: 'Nuria Duarte Ibáñez',
      clienteDni: '00000004G',
      clienteDomicilio: 'Calle de la Fuente, 27, 3.º 2.ª, 00120 Valdemor (Nortia)',
      tipoVivienda: 'Piso de 3 o 4 habitaciones con ascensor',
      ubicacionesBusqueda: 'Valdemor centro y barrio Alto',
      rangoPrecio: 'entre 150.000 y 220.000 euros',
      duracionEncargo: 'seis meses',
      honorariosTotales: '3.000',
      honorariosPrimerPago: '1.500',
      honorariosSegundoPago: '1.500',
    },
    notas: 'Mandato firmado. Primer pago de honorarios ya facturado.',
  },
  {
    ref: 'psi-cifuentes',
    secuencia: 4,
    titulo: 'Encargo de personal shopper inmobiliario — Javier Cifuentes Olmo',
    templateKey: 'psi',
    estado: ContractState.BORRADOR,
    clienteRef: 'cifuentes',
    creadoHace: 8,
    datos: {
      clienteNombre: 'Javier Cifuentes Olmo',
      clienteDni: '00000003A',
      clienteDomicilio: 'Calle del Norte, 88, 00110 Altabria (Nortia)',
      tipoVivienda: 'Piso a reformar para revender',
      ubicacionesBusqueda: 'Altabria y Serranova',
      rangoPrecio: 'entre 90.000 y 140.000 euros',
      duracionEncargo: 'cuatro meses',
      honorariosTotales: '2.500',
      honorariosPrimerPago: '1.250',
      honorariosSegundoPago: '1.250',
    },
    notas: 'Borrador pendiente de repasar los honorarios antes de enviarlo.',
  },
  {
    ref: 'reserva-escalante',
    secuencia: 5,
    titulo: 'Documento de reserva — casa de Serranova',
    templateKey: 'reserva',
    estado: ContractState.VISTO,
    clienteRef: 'escalante',
    propiedadRef: 'serranova-molino',
    creadoHace: 5,
    enviadoHace: 4,
    vistoHace: 2,
    destinatarioEmail: 'ignacio.escalante@example.com',
    finEnDias: 10,
    datos: {
      firmanteNombre: 'Ignacio Escalante Puig',
      firmanteDni: '00000005M',
      firmanteDomicilio: 'Paseo de los Tilos, 5, 00130 Serranova (Nortia)',
      direccionInmueble: 'Calle del Molino, 9, 00130 Serranova (Nortia)',
      importeReservaBase: '5.000',
      importeReservaTotal: '6.050',
      importeReservaLetras: 'seis mil cincuenta euros',
      precioMensualCifra: '318.000',
      precioMensualLetras: 'trescientos dieciocho mil euros',
    },
    notas: 'El cliente ha abierto el enlace pero aún no ha firmado. Llamarle mañana.',
  },
  {
    ref: 'alquiler-quilate',
    secuencia: 6,
    titulo: 'Alquiler temporal — Talleres Quilate, S.L.',
    templateKey: 'alquiler-temporal',
    estado: ContractState.ANULADO,
    clienteRef: 'quilate',
    propiedadRef: 'ribaverde-mayor',
    creadoHace: 45,
    enviadoHace: 44,
    destinatarioEmail: 'gerencia@quilate.example',
    inicioEnDias: -10,
    finEnDias: 170,
    datos: {
      arrendatarioRazonSocial: 'Talleres Quilate, S.L.',
      arrendatarioCif: 'B00000003',
      arrendatarioDomicilio: "Camino del Puente, 31, 00230 Ribaverde (Marenza)",
      arrendatarioAdministrador: 'Ramón Quintana Sáez',
      arrendatarioAdministradorDni: '00000012N',
      arrendadorNombre: 'Vantia Patrimonio, S.L.',
      arrendadorDni: 'B00000000',
      arrendadorDomicilio: 'Calle Mayor, 18, 00210 Maralta (Marenza)',
      direccionInmueble: 'Calle Mayor, 61, 3.º, 00230 Ribaverde',
      temporada: 'Campaña de mantenimiento industrial',
      duracionContrato: 'seis meses',
      precioMensualCifra: '760',
      precioMensualLetras: 'setecientos sesenta euros',
      diaPago: '5',
      iban: 'ES00 0000 0000 0000 0000 0000',
      fianzaCifra: '1.520',
      fianzaLetras: 'mil quinientos veinte euros',
      responsableDatos: 'Vantia Patrimonio, S.L.',
    },
    notas: 'Anulado: la empresa aplaza el desplazamiento de los operarios.',
  },
];
