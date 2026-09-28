import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { ObjectLiteral, Repository } from 'typeorm';
import { ISeedResult } from './interfaces/seed-result.interface';
import { DEMO_CLIENTS, IDemoClient } from './data/demo-clients.seed';
import { DEMO_PROPERTIES } from './data/demo-properties.seed';
import { DEMO_CONTRACTS, IDemoContract } from './data/demo-contracts.seed';
import { DEMO_INVOICES, IDemoInvoice } from './data/demo-invoices.seed';
import {
  DEMO_DATASET_DESCRIPTION,
  DEMO_DATASET_KEY,
  IDemoDataset,
  datasetVacio,
  leerDataset,
} from './data/demo-dataset';
import { Config } from '../config/entities/config.entity';
import { Client } from '../clients/entities/client.entity';
import { ClientActivity } from '../clients/entities/client-activity.entity';
import { ClientStatus } from '../clients/enums';
import { Property } from '../properties/entities/property.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { ContractTemplate } from '../contracts/entities/contract-template.entity';
import { ContractsService } from '../contracts/contracts.service';
import { Invoice } from '../billing/entities/invoice.entity';
import { InvoiceSequence } from '../billing/entities/invoice-sequence.entity';
import { InvoiceStatus } from '../billing/enums/invoice-status.enum';
import { IInvoiceLine } from '../billing/interfaces/invoice-line.interface';
import { redondear } from '../billing/helpers/money.helper';
import { User } from '../user/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationRulesService } from '../notifications/notification-rules.service';
import {
  NotificationPriority,
  NotificationType,
} from '../notifications/enums/notification-type.enum';
import { NotificationEntityType } from '../notifications/enums/notification-entity-type.enum';
import { formatearFechaLarga } from '../notifications/helpers/contract-dates.helper';

/** Nombre con el que se firman los apuntes del historial de la demo. */
const AUTORA_DEMO = 'Vantia';

/** Meses en espanol, para rellenar los marcadores de las plantillas. */
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/**
 * Semilla de datos de demostracion.
 *
 * Puebla el CRM con un escenario completo y verosimil de la agencia: doce
 * clientes repartidos por las tres lineas de negocio, diez inmuebles en las
 * siete zonas de operacion, seis contratos en distintos estados, cuatro
 * facturas correlativas y las alertas correspondientes.
 *
 * Se ejecuta de dos formas:
 *  - `npm run seed` (opcionalmente con `-- --reset`);
 *  - `POST /api/seed/demo`, protegido con `ALL_PRIVILEGES`.
 *
 * Es conservadora por defecto: si ya hay clientes en la base de datos NO toca
 * nada. Solo con `reiniciar: true` vacia las tablas de demo antes de sembrar.
 *
 * Cada siembra deja una MARCA en `configs` (`demo.dataset`) con los
 * identificadores exactos de lo que ha escrito. Es lo que hace trivial la
 * limpieza posterior: `limpiarDatosDemo()` borra eso y solo eso, sin tener que
 * adivinar por el nombre que registro era de prueba y cual del cliente.
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientDAO: Repository<Client>,
    @InjectRepository(ClientActivity)
    private readonly clientActivityDAO: Repository<ClientActivity>,
    @InjectRepository(Property)
    private readonly propertyDAO: Repository<Property>,
    @InjectRepository(Contract)
    private readonly contractDAO: Repository<Contract>,
    @InjectRepository(ContractTemplate)
    private readonly contractTemplateDAO: Repository<ContractTemplate>,
    @InjectRepository(Invoice)
    private readonly invoiceDAO: Repository<Invoice>,
    @InjectRepository(InvoiceSequence)
    private readonly invoiceSequenceDAO: Repository<InvoiceSequence>,
    @InjectRepository(User)
    private readonly userDAO: Repository<User>,
    @InjectRepository(Config)
    private readonly configDAO: Repository<Config>,
    private readonly notificationsService: NotificationsService,
    private readonly notificationRulesService: NotificationRulesService,
    // Se inyecta el servicio entero, y no el repositorio, porque generar un
    // contrato es rellenar la plantilla y convertirla a PDF: logica que vive en
    // `contracts/` y que la semilla no debe duplicar.
    private readonly contractsService: ContractsService,
  ) {}

  // -------------------------------------------------------------------------
  // Entrada principal
  // -------------------------------------------------------------------------

  /**
   * Puebla la base de datos con el escenario de demostracion.
   *
   * @param reiniciar Si es `true`, vacia primero clientes, historial,
   *        inmuebles, contratos, facturas y alertas. Si es `false` (por
   *        defecto) y ya hay clientes, no hace nada.
   * @returns Recuento de lo escrito y mensaje en espanol.
   */
  async poblarDemo(reiniciar = false): Promise<ISeedResult> {
    const clientesExistentes = await this.clientDAO.count();

    if (clientesExistentes > 0 && !reiniciar) {
      return this.resultadoVacio(
        `La base de datos ya tiene ${clientesExistentes} cliente(s). No se ha tocado nada: vuelve a lanzarlo con la opción de reinicio si quieres sustituir los datos por los de demostración.`,
      );
    }

    if (reiniciar) {
      await this.vaciarDatosDemo();
      this.logger.warn('Datos previos eliminados antes de sembrar la demostración');
    }

    const autorId = await this.obtenerAutorId();

    const { clientes, actividades } = await this.sembrarClientes(autorId);
    const propiedades = await this.sembrarPropiedades(clientes);
    const contratos = await this.sembrarContratos(clientes, propiedades);
    const facturas = await this.sembrarFacturas(clientes, contratos);
    const notificaciones = await this.sembrarNotificaciones(
      clientes,
      contratos,
      autorId,
    );

    // Con los datos ya en su sitio se lanza el motor de reglas: asi la campana
    // arranca con las alertas reales del escenario (prorroga, firmas, etc.).
    const revision = await this.notificationRulesService.ejecutarReglas();

    // Y al final, los documentos de los contratos. Va aqui, despues de todo lo
    // que escribe en base, porque es el unico paso que depende de un servicio
    // externo (Gotenberg) y no debe retrasar ni comprometer el resto.
    const contratosConPdf = await this.generarDocumentosContratos(contratos);

    // Se anota TODO lo escrito para que retirar la demo sea exacto. Las alertas
    // se releen de la base: a las de la semilla se suman las que acaba de crear
    // el motor de reglas, que tambien son datos de demostracion.
    const inventario = await this.anotarDataset({
      clientes: [...clientes.values()].map((cliente) => cliente.id),
      propiedades: [...propiedades.values()].map((propiedad) => propiedad.id),
      contratos: [...contratos.values()].map((contrato) => contrato.id),
      facturas,
      notificaciones: [...notificaciones, ...revision.idsCreados],
    });

    const totalAlertas = inventario.notificaciones.length;
    const resultado: ISeedResult = {
      omitido: false,
      reiniciado: reiniciar,
      mensaje:
        `Demostración cargada: ${clientes.size} clientes, ${propiedades.size} inmuebles, ${contratos.size} contratos, ${facturas.length} facturas y ${totalAlertas} alertas. ` +
        `Contratos con PDF listo: ${contratosConPdf} de ${contratos.size}.`,
      registros: {
        clientes: clientes.size,
        actividades,
        propiedades: propiedades.size,
        contratos: contratos.size,
        facturas: facturas.length,
        notificaciones: totalAlertas,
      },
      ejecutadoAt: new Date().toISOString(),
    };

    this.logger.log(resultado.mensaje);
    return resultado;
  }

  // -------------------------------------------------------------------------
  // Clientes e historial
  // -------------------------------------------------------------------------

  /** Inserta los doce clientes de demostracion con su historial. */
  private async sembrarClientes(
    autorId: number | null,
  ): Promise<{ clientes: Map<string, Client>; actividades: number }> {
    const clientes = new Map<string, Client>();
    let actividades = 0;

    for (const semilla of DEMO_CLIENTS) {
      const cliente = await this.clientDAO.save(
        this.clientDAO.create({
          nombre: semilla.nombre,
          apellidos: semilla.apellidos ?? null,
          email: semilla.email,
          telefono: semilla.telefono,
          documento: semilla.documento,
          tipo: semilla.tipo,
          lineaNegocio: semilla.lineaNegocio,
          etapa: semilla.etapa,
          presupuestoMin: semilla.presupuestoMin ?? null,
          presupuestoMax: semilla.presupuestoMax ?? null,
          zonasInteres: semilla.zonasInteres,
          tipoOperacion: semilla.tipoOperacion ?? null,
          origen: semilla.origen,
          notas: semilla.notas,
          estado: semilla.estado ?? ClientStatus.ACTIVO,
          motivoDescarte: semilla.motivoDescarte ?? null,
          fechaDescarte:
            semilla.estado === ClientStatus.DESCARTADO
              ? this.hace(this.ultimoApunte(semilla))
              : null,
          responsableId: autorId,
        }),
      );

      // `createdAt` lo escribe TypeORM al insertar: se reescribe despues para
      // que la antiguedad de cada ficha sea la del escenario.
      await this.reescribirFechaAlta(
        this.clientDAO,
        cliente.id,
        this.hace(semilla.altaHace),
      );

      for (const apunte of semilla.actividades) {
        await this.clientActivityDAO.save(
          this.clientActivityDAO.create({
            clientId: cliente.id,
            tipo: apunte.tipo,
            descripcion: apunte.descripcion,
            fecha: this.hace(apunte.hace),
            autor: AUTORA_DEMO,
            autorId,
          }),
        );
        actividades += 1;
      }

      clientes.set(semilla.ref, cliente);
    }

    return { clientes, actividades };
  }

  // -------------------------------------------------------------------------
  // Inmuebles
  // -------------------------------------------------------------------------

  /** Inserta los diez inmuebles de la cartera de demostracion. */
  private async sembrarPropiedades(
    clientes: Map<string, Client>,
  ): Promise<Map<string, Property>> {
    const propiedades = new Map<string, Property>();

    for (const semilla of DEMO_PROPERTIES) {
      const propiedad = await this.propertyDAO.save(
        this.propertyDAO.create({
          referencia: semilla.referencia,
          titulo: semilla.titulo,
          tipo: semilla.tipo,
          direccion: semilla.direccion,
          zona: semilla.zona,
          poblacion: semilla.poblacion,
          provincia: semilla.provincia,
          codigoPostal: semilla.codigoPostal,
          precio: semilla.precio,
          superficie: semilla.superficie,
          habitaciones: semilla.habitaciones,
          estado: semilla.estado,
          descripcion: semilla.descripcion,
          caracteristicas: semilla.caracteristicas,
          fotos: [],
          rentabilidadEstimada: semilla.rentabilidadEstimada,
          clientId: semilla.clienteRef
            ? (clientes.get(semilla.clienteRef)?.id ?? null)
            : null,
          notas: semilla.notas ?? null,
        }),
      );

      await this.reescribirFechaAlta(
        this.propertyDAO,
        propiedad.id,
        this.hace(semilla.altaHace),
      );

      propiedades.set(semilla.ref, propiedad);
    }

    return propiedades;
  }

  // -------------------------------------------------------------------------
  // Contratos
  // -------------------------------------------------------------------------

  /** Inserta los seis contratos de demostracion en sus distintos estados. */
  private async sembrarContratos(
    clientes: Map<string, Client>,
    propiedades: Map<string, Property>,
  ): Promise<Map<string, Contract>> {
    const contratos = new Map<string, Contract>();
    const ejercicio = new Date().getFullYear();

    // Las plantillas las siembra `contracts/`; aqui solo se enlazan si existen.
    const plantillas = await this.contractTemplateDAO.find();
    const plantillaPorClave = new Map(
      plantillas.map((plantilla) => [plantilla.key, plantilla]),
    );

    for (const semilla of DEMO_CONTRACTS) {
      const cliente = clientes.get(semilla.clienteRef);
      const propiedad = semilla.propiedadRef
        ? propiedades.get(semilla.propiedadRef)
        : undefined;
      const plantilla = plantillaPorClave.get(semilla.templateKey);

      const enviado = semilla.enviadoHace !== undefined;
      const contrato = await this.contractDAO.save(
        this.contractDAO.create({
          referencia: `CT-${ejercicio}-${String(semilla.secuencia).padStart(4, '0')}`,
          titulo: semilla.titulo,
          templateId: plantilla?.id ?? null,
          templateKey: semilla.templateKey,
          datos: this.completarDatosContrato(semilla),
          clienteId: cliente?.id ?? null,
          clienteNombre: cliente ? this.nombreCompleto(cliente) : null,
          propiedadId: propiedad?.id ?? null,
          propiedadDireccion: propiedad?.direccion ?? null,
          estado: semilla.estado,
          publicToken: enviado ? randomBytes(24).toString('hex') : null,
          destinatarioEmail: semilla.destinatarioEmail ?? null,
          enviadoAt: this.haceOpcional(semilla.enviadoHace),
          vistoAt: this.haceOpcional(semilla.vistoHace),
          firmadoAt: this.haceOpcional(semilla.firmadoHace),
          firmanteNombre: semilla.firmanteNombre ?? null,
          firmanteIp:
            semilla.firmadoHace !== undefined ? '203.0.113.10' : null,
          notas: semilla.notas ?? null,
        }),
      );

      await this.reescribirFechaAlta(
        this.contractDAO,
        contrato.id,
        this.hace(semilla.creadoHace),
      );

      contratos.set(semilla.ref, contrato);
    }

    return contratos;
  }

  /**
   * Genera el .docx y el .pdf de cada contrato sembrado.
   *
   * `sembrarContratos` solo escribe la fila: rellenar la plantilla y convertirla
   * es trabajo de `contracts/`. Sin este paso, tras un reseed la demo tenia seis
   * contratos sin fichero y `GET /api/contracts/:id/pdf` respondia 404 hasta que
   * alguien pulsaba «Generar el PDF» en cada ficha, una a una.
   *
   * Se reutiliza `ContractsService.regenerarPdf`, que es exactamente la pieza
   * que hay detras de ese boton: misma plantilla, mismos marcadores y, en los
   * contratos ya firmados, la misma pagina de diligencia de firma.
   *
   * Ningun fallo aqui tumba la siembra. Si Gotenberg no responde, los datos ya
   * estan escritos y el .docx tambien: solo faltara el PDF, que se puede rehacer
   * despues desde la ficha. Se deja constancia en el log de cual ha fallado.
   *
   * @returns Cuantos contratos han quedado con PDF.
   */
  private async generarDocumentosContratos(
    contratos: Map<string, Contract>,
  ): Promise<number> {
    let generados = 0;

    for (const contrato of contratos.values()) {
      try {
        await this.contractsService.regenerarPdf(contrato.id);
        generados++;
      } catch (error) {
        const detalle =
          (error as { response?: { message?: string } })?.response?.message ??
          (error as Error)?.message ??
          'error desconocido';
        this.logger.warn(
          `El contrato ${contrato.referencia} se ha sembrado sin PDF: ${detalle}`,
        );
      }
    }

    this.logger.log(
      `Documentos de contrato generados: ${generados} de ${contratos.size}.`,
    );

    return generados;
  }

  /**
   * Completa los marcadores de fecha de la plantilla a partir de los desfases
   * declarados en la semilla, de modo que el escenario sigue siendo coherente
   * el dia que se lance (el contrato que «vence en 18 dias» siempre vence en 18
   * dias, no en una fecha fija que ya paso).
   */
  private completarDatosContrato(
    semilla: IDemoContract,
  ): Record<string, unknown> {
    const datos: Record<string, unknown> = { ...semilla.datos };

    const fechaContrato = this.hace(semilla.creadoHace);
    datos.diaContrato = String(fechaContrato.getDate());
    datos.mesContrato = MESES[fechaContrato.getMonth()];
    datos.anioContrato = String(fechaContrato.getFullYear());

    if (semilla.inicioEnDias !== undefined) {
      const inicio = this.dentroDe(semilla.inicioEnDias);
      datos.inicioDia = String(inicio.getDate());
      datos.inicioMes = MESES[inicio.getMonth()];
      datos.inicioAnio = String(inicio.getFullYear());
    }

    if (semilla.finEnDias !== undefined) {
      const fin = this.dentroDe(semilla.finEnDias);
      datos.finDia = String(fin.getDate());
      datos.finMes = MESES[fin.getMonth()];
      datos.finAnio = String(fin.getFullYear());

      // La reserva no tiene trio dia/mes/anio: expresa su vigencia en prosa.
      if (semilla.templateKey === 'reserva') {
        datos.validezHasta = formatearFechaLarga(fin);
      }
    }

    return datos;
  }

  // -------------------------------------------------------------------------
  // Facturas
  // -------------------------------------------------------------------------

  /**
   * Inserta las facturas de demostracion y ajusta el correlativo.
   *
   * La secuencia NO viene dada: se calcula aqui ordenando las facturas por
   * fecha de emision y numerandolas 1..N sin huecos. Una numeracion correlativa
   * que no siga el orden de emision no es correlativa, y en la demo se veia:
   * la FRA-0003 y la FRA-0004 estaban emitidas antes que la FRA-0001.
   */
  private async sembrarFacturas(
    clientes: Map<string, Client>,
    contratos: Map<string, Contract>,
  ): Promise<number[]> {
    const ejercicio = new Date().getFullYear();
    const creadas: number[] = [];
    let ultimaSecuencia = 0;

    const enOrden = DEMO_INVOICES.map((semilla) => ({
      semilla,
      emitidaEl: this.fechaEmision(semilla),
    })).sort((a, b) => a.emitidaEl.getTime() - b.emitidaEl.getTime());

    for (const [indice, { semilla, emitidaEl }] of enOrden.entries()) {
      const secuencia = indice + 1;
      const cliente = clientes.get(semilla.clienteRef);
      const contrato = semilla.contratoRef
        ? contratos.get(semilla.contratoRef)
        : undefined;

      const lineas = this.calcularLineas(semilla);
      const baseImponible = redondear(
        lineas.reduce((suma, linea) => suma + linea.importe, 0),
      );
      const cuotaIva = redondear((baseImponible * semilla.tipoIva) / 100);
      const total = redondear(baseImponible + cuotaIva);

      const factura = await this.invoiceDAO.save(
        this.invoiceDAO.create({
          numero: `FRA-${ejercicio}-${String(secuencia).padStart(4, '0')}`,
          ejercicio,
          secuencia,
          clienteId: cliente?.id ?? 0,
          clienteNombre: cliente ? this.nombreCompleto(cliente) : 'Cliente',
          clienteDocumento: cliente?.documento ?? null,
          clienteDireccion: this.direccionFiscal(semilla.clienteRef),
          clienteEmail: cliente?.email ?? null,
          contratoId: contrato?.id ?? null,
          contratoReferencia: contrato?.referencia ?? null,
          lineas,
          baseImponible,
          tipoIva: semilla.tipoIva,
          cuotaIva,
          total,
          estado: semilla.estado,
          fechaEmision: this.aFechaIso(emitidaEl),
          fechaCobro:
            semilla.estado === InvoiceStatus.COBRADA &&
            semilla.cobroHace !== undefined
              ? this.aFechaIso(this.hace(semilla.cobroHace))
              : null,
          notas: semilla.notas ?? null,
        }),
      );

      await this.reescribirFechaAlta(this.invoiceDAO, factura.id, emitidaEl);

      creadas.push(factura.id);
      ultimaSecuencia = secuencia;
    }

    // El contador del ejercicio debe quedar por detras de la ultima factura
    // sembrada: si no, la primera factura real repetiria numero.
    if (ultimaSecuencia > 0) {
      const contador =
        (await this.invoiceSequenceDAO.findOne({ where: { ejercicio } })) ??
        this.invoiceSequenceDAO.create({ ejercicio, ultimoNumero: 0 });

      if (contador.ultimoNumero < ultimaSecuencia) {
        contador.ultimoNumero = ultimaSecuencia;
        await this.invoiceSequenceDAO.save(contador);
      }
    }

    return creadas;
  }

  /** Calcula el importe de cada linea de una factura de demostracion. */
  private calcularLineas(semilla: IDemoInvoice): IInvoiceLine[] {
    return semilla.lineas.map((linea) => ({
      concepto: linea.concepto,
      cantidad: linea.cantidad,
      precioUnitario: redondear(linea.precioUnitario),
      importe: redondear(linea.cantidad * linea.precioUnitario),
    }));
  }

  /**
   * Resuelve la fecha de emision. Con `diaDelMes` se ancla al mes en curso
   * (recortando al dia de hoy si aun no ha llegado), de modo que la tarjeta de
   * facturacion del mes siempre tenga dato en la demo.
   */
  private fechaEmision(semilla: IDemoInvoice): Date {
    if ('hace' in semilla.emision) return this.hace(semilla.emision.hace);

    const hoy = new Date();
    const dia = Math.min(semilla.emision.diaDelMes, hoy.getDate());
    return new Date(hoy.getFullYear(), hoy.getMonth(), dia, 12, 0, 0, 0);
  }

  /** Domicilio fiscal declarado en la semilla del cliente. */
  private direccionFiscal(clienteRef: string): string | null {
    const semilla = DEMO_CLIENTS.find((cliente) => cliente.ref === clienteRef);
    return semilla?.direccionFiscal ?? null;
  }

  // -------------------------------------------------------------------------
  // Alertas de ejemplo
  // -------------------------------------------------------------------------

  /**
   * Recordatorios de agenda del escenario. Las alertas de negocio (prorrogas,
   * firmas, inactividad, cobros) NO se siembran a mano: las genera el motor de
   * reglas justo despues, a partir de los datos reales.
   *
   * Esa division es lo que mantiene coherentes la campana y el cuadro de mando.
   * Todo aviso automatico sembrado a mano seria un aviso que el panel no
   * calcula (o que calcula con otras cifras), y esas son exactamente las dos
   * incoherencias que se veian en la demo.
   *
   * Tampoco se siembra ninguna alerta de tipo `sistema`: el aviso «datos de
   * demostracion cargados» anunciaba por escrito, delante del cliente, que los
   * datos eran inventados. La carga ya queda registrada en el log del servidor.
   */
  private async sembrarNotificaciones(
    clientes: Map<string, Client>,
    contratos: Map<string, Contract>,
    autorId: number | null,
  ): Promise<number[]> {
    const fuentes = clientes.get('fuentes');
    const ibarra = clientes.get('ibarra');
    const reserva = contratos.get('reserva-escalante');

    const creadas = await this.notificationsService.createRaw([
      {
        tipo: NotificationType.RECORDATORIO,
        titulo: 'Firma en notaría el jueves',
        mensaje: `Escritura de compraventa de ${fuentes ? this.nombreCompleto(fuentes) : 'Rocío Fuentes Arcos'} en la notaría de Valdemor. Llevar la provisión de fondos y la nota simple actualizada.`,
        prioridad: NotificationPriority.ALTA,
        usuarioId: autorId,
        entidadTipo: NotificationEntityType.CLIENTE,
        entidadId: fuentes?.id,
        entidadNombre: fuentes ? this.nombreCompleto(fuentes) : null,
        createdAt: this.hace(1),
      },
      {
        tipo: NotificationType.RECORDATORIO,
        titulo: 'Llamar a Ignacio Escalante',
        mensaje: `Ha abierto el documento de reserva ${reserva?.referencia ?? ''} pero todavía no lo ha firmado. Confirmar por teléfono antes del viernes.`,
        prioridad: NotificationPriority.MEDIA,
        usuarioId: autorId,
        entidadTipo: NotificationEntityType.CONTRATO,
        entidadId: reserva?.id,
        entidadNombre: reserva?.referencia ?? null,
        createdAt: this.hace(2),
      },
      {
        // Va contra el cliente que esta EN OBRA, no contra el de la reserva:
        // un recordatorio de visita de obra colgado de otra ficha es de las
        // incoherencias que se notan si alguien pulsa el aviso en la demo.
        tipo: NotificationType.RECORDATORIO,
        titulo: 'Visita de obra confirmada',
        mensaje: `Visita semanal a la reforma de ${ibarra ? this.nombreCompleto(ibarra) : 'Sergio Ibarra Coll'}. El industrial entrega la certificación de albañilería.`,
        prioridad: NotificationPriority.BAJA,
        usuarioId: autorId,
        entidadTipo: NotificationEntityType.CLIENTE,
        entidadId: ibarra?.id,
        entidadNombre: ibarra ? this.nombreCompleto(ibarra) : null,
        leida: true,
        createdAt: this.hace(6),
      },
    ]);

    return creadas.map((alerta) => alerta.id);
  }

  // -------------------------------------------------------------------------
  // Limpieza
  // -------------------------------------------------------------------------

  /**
   * Vacia las tablas que puebla la demostracion, en orden inverso al de sus
   * dependencias. NO toca usuarios, roles ni plantillas de contrato.
   *
   * Es el martillo: borra TODO el contenido de esas tablas, sea de la demo o
   * no. Solo se usa desde `poblarDemo(reiniciar: true)`, donde el que llama ya
   * ha pedido explicitamente sustituir los datos. Para retirar solo la
   * demostracion y respetar lo demas esta `limpiarDatosDemo()`.
   */
  private async vaciarDatosDemo(): Promise<void> {
    await this.notificationsService.removeAll();
    await this.invoiceDAO.createQueryBuilder().delete().execute();
    await this.contractDAO.createQueryBuilder().delete().execute();
    await this.propertyDAO.createQueryBuilder().delete().execute();
    await this.clientActivityDAO.createQueryBuilder().delete().execute();
    await this.clientDAO.createQueryBuilder().delete().execute();
    await this.configDAO.delete({ key: DEMO_DATASET_KEY });

    const ejercicio = new Date().getFullYear();
    const contador = await this.invoiceSequenceDAO.findOne({
      where: { ejercicio },
    });
    if (contador) {
      contador.ultimoNumero = 0;
      await this.invoiceSequenceDAO.save(contador);
    }
  }

  /**
   * Retira la demostracion dejando intacto todo lo demas.
   *
   * Borra EXACTAMENTE los registros anotados en la marca de datos demo, en
   * orden inverso al de sus dependencias. Si no hay marca no borra nada: sin
   * inventario no hay forma de saber que es de la demo y que es del cliente, y
   * adivinarlo por el nombre es como se pierden datos de verdad.
   *
   * @returns Recuento de lo borrado por tabla.
   */
  async limpiarDatosDemo(): Promise<{
    encontrada: boolean;
    mensaje: string;
    borrados: Record<string, number>;
  }> {
    const inventario = await this.estadoDataset();

    if (!inventario) {
      return {
        encontrada: false,
        mensaje:
          'No hay ninguna marca de datos de demostración en esta instalación, así que no se ha borrado nada. La marca la escribe la propia semilla al cargar el escenario.',
        borrados: {},
      };
    }

    const borrar = async (
      repositorio: Repository<ObjectLiteral>,
      ids: number[],
    ): Promise<number> => {
      if (ids.length === 0) return 0;
      const { affected } = await repositorio.delete(ids);
      return affected ?? 0;
    };

    const borrados = {
      notificaciones: await this.notificationsService.removeMany(
        inventario.notificaciones,
      ),
      facturas: await borrar(this.invoiceDAO, inventario.facturas),
      contratos: await borrar(this.contractDAO, inventario.contratos),
      propiedades: await borrar(this.propertyDAO, inventario.propiedades),
      // El historial cae con el cliente: `client_activities` tiene la clave
      // ajena con ON DELETE CASCADE.
      clientes: await borrar(this.clientDAO, inventario.clientes),
    };

    await this.configDAO.delete({ key: DEMO_DATASET_KEY });

    const total = Object.values(borrados).reduce((suma, n) => suma + n, 0);
    const mensaje = `Datos de demostración retirados: ${borrados.clientes} clientes, ${borrados.propiedades} inmuebles, ${borrados.contratos} contratos, ${borrados.facturas} facturas y ${borrados.notificaciones} alertas (${total} registros).`;

    this.logger.warn(mensaje);
    return { encontrada: true, mensaje, borrados };
  }

  /**
   * Marca de datos de demostracion guardada en esta instalacion.
   * @returns El inventario, o `null` si no hay marca o esta ilegible.
   */
  async estadoDataset(): Promise<IDemoDataset | null> {
    const fila = await this.configDAO.findOne({
      where: { key: DEMO_DATASET_KEY },
    });
    return leerDataset(fila?.value);
  }

  /**
   * Anota en `configs` todo lo que acaba de escribir la semilla.
   *
   * Se escribe SIEMPRE la fila completa (no se acumula sobre una anterior): una
   * siembra sustituye a la anterior, y un inventario que arrastrase ids de una
   * carga previa apuntaria a registros que ya no existen.
   */
  private async anotarDataset(
    contenido: Omit<IDemoDataset, 'version' | 'sembradoAt'>,
  ): Promise<IDemoDataset> {
    const inventario: IDemoDataset = { ...datasetVacio(), ...contenido };

    const fila =
      (await this.configDAO.findOne({ where: { key: DEMO_DATASET_KEY } })) ??
      this.configDAO.create({ key: DEMO_DATASET_KEY });

    fila.value = JSON.stringify(inventario);
    fila.description = DEMO_DATASET_DESCRIPTION;
    await this.configDAO.save(fila);

    return inventario;
  }

  // -------------------------------------------------------------------------
  // Utilidades
  // -------------------------------------------------------------------------

  /** Usuario al que se atribuyen las fichas y los apuntes de la demo. */
  private async obtenerAutorId(): Promise<number | null> {
    const [usuario] = await this.userDAO.find({
      order: { id: 'asc' },
      take: 1,
    });
    return usuario?.id ?? null;
  }

  /** Nombre completo de un cliente, listo para mostrarse. */
  private nombreCompleto(cliente: Client): string {
    return `${cliente.nombre ?? ''} ${cliente.apellidos ?? ''}`.trim();
  }

  /** Dia del ultimo apunte del historial de un cliente de la semilla. */
  private ultimoApunte(semilla: IDemoClient): number {
    return semilla.actividades.reduce(
      (minimo, apunte) => Math.min(minimo, apunte.hace),
      semilla.altaHace,
    );
  }

  /** Fecha de hace `dias` dias, a mediodia. */
  private hace(dias: number): Date {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    fecha.setHours(12, 0, 0, 0);
    return fecha;
  }

  /** Igual que `hace`, pero devuelve `null` si no se indica desfase. */
  private haceOpcional(dias?: number): Date | null {
    return dias === undefined ? null : this.hace(dias);
  }

  /** Fecha dentro de `dias` dias (negativo: hacia atras), a mediodia. */
  private dentroDe(dias: number): Date {
    return this.hace(-dias);
  }

  /** Fecha en formato `YYYY-MM-DD`. */
  private aFechaIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Reescribe la fecha de alta de un registro recien insertado.
   * `@CreateDateColumn` la fija TypeORM al guardar, asi que la unica forma de
   * dar antiguedad realista a los datos de demo es actualizarla despues.
   */
  private async reescribirFechaAlta(
    repositorio: Repository<ObjectLiteral>,
    id: number,
    fecha: Date,
  ): Promise<void> {
    await repositorio
      .createQueryBuilder()
      .update()
      .set({ createdAt: fecha })
      .where('id = :id', { id })
      .execute();
  }

  /** Resultado devuelto cuando la semilla decide no tocar nada. */
  private resultadoVacio(mensaje: string): ISeedResult {
    return {
      omitido: true,
      reiniciado: false,
      mensaje,
      registros: {
        clientes: 0,
        actividades: 0,
        propiedades: 0,
        contratos: 0,
        facturas: 0,
        notificaciones: 0,
      },
      ejecutadoAt: new Date().toISOString(),
    };
  }
}
