import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Not, Repository } from 'typeorm';
import {
  IAssistantActionResult,
  IDashboardQueries,
} from '../common/contracts/assistant-actions';
import {
  IBillingMetrics,
  IClientsMetrics,
  IContractsMetrics,
  ICount,
  IDashboardHeadline,
  IDashboardSummary,
  IDashboardTask,
  IPendingSignature,
  IPropertiesMetrics,
  IRecentActivityItem,
  IUpcomingDeadline,
} from './interfaces/dashboard-metrics.interface';
import { Client } from '../clients/entities/client.entity';
import { ClientActivity } from '../clients/entities/client-activity.entity';
import {
  BusinessLine,
  BusinessLineLabels,
  BusinessLineList,
  ClientActivityType,
  ClientActivityTypeLabels,
  ClientStage,
  ClientStageLabels,
  ClientStatus,
  getStagesByBusinessLine,
} from '../clients/enums';
import { Property } from '../properties/entities/property.entity';
import {
  PROPERTY_STATUSES,
  PropertyStatus,
  PropertyStatusLabels,
} from '../properties/enums/property-status.enum';
import {
  PROPERTY_ZONES,
  PropertyZone,
  PropertyZoneLabels,
} from '../properties/enums/property-zone.enum';
import { Contract } from '../contracts/entities/contract.entity';
import {
  ContractState,
  ContractStateLabels,
} from '../contracts/enums/contract-state.enum';
import { Invoice } from '../billing/entities/invoice.entity';
import { InvoiceStatus } from '../billing/enums/invoice-status.enum';
import { NotificationRulesService } from '../notifications/notification-rules.service';
import { NotificationTypeLabels } from '../notifications/enums/notification-type.enum';
import { NotificationEntityRoutes } from '../notifications/enums/notification-entity-type.enum';
import {
  diasDesde,
  diasHasta,
  resolveContractEndDate,
} from '../notifications/helpers/contract-dates.helper';

/** Estados de contrato que significan «a la espera de la firma del cliente». */
const ESTADOS_PENDIENTE_FIRMA: ContractState[] = [
  ContractState.ENVIADO,
  ContractState.VISTO,
];

/**
 * Servicio del cuadro de mando.
 *
 * Solo LEE de los demas dominios: agrega clientes, inmuebles, contratos y
 * facturas para dar la foto del negocio. Implementa ademas `IDashboardQueries`,
 * el contrato con el que el asistente de IA responde preguntas de situacion
 * («¿qué tengo pendiente de firma?», «¿qué vence este mes?»).
 */
@Injectable()
export class DashboardService implements IDashboardQueries {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientDAO: Repository<Client>,
    @InjectRepository(ClientActivity)
    private readonly clientActivityDAO: Repository<ClientActivity>,
    @InjectRepository(Property)
    private readonly propertyDAO: Repository<Property>,
    @InjectRepository(Contract)
    private readonly contractDAO: Repository<Contract>,
    @InjectRepository(Invoice)
    private readonly invoiceDAO: Repository<Invoice>,
    private readonly notificationRulesService: NotificationRulesService,
  ) {}

  // -------------------------------------------------------------------------
  // Resumen completo
  // -------------------------------------------------------------------------

  /**
   * Devuelve de una sola vez todo lo que pinta la pantalla del panel, para que
   * la interfaz no tenga que encadenar seis peticiones.
   */
  async resumen(): Promise<IDashboardSummary> {
    const [
      clientes,
      propiedades,
      contratos,
      facturacion,
      actividadReciente,
      tareasHoy,
      firmasPendientes,
    ] = await Promise.all([
      this.metricasClientes(),
      this.metricasPropiedades(),
      this.metricasContratos(),
      this.facturacionMes(),
      this.actividadReciente(8),
      this.tareasHoy(),
      this.listarFirmasPendientes(),
    ]);

    const titulares: IDashboardHeadline = {
      clientesActivos: clientes.activos,
      inmueblesCartera: propiedades.total,
      contratosPendientesFirma: contratos.pendientesFirma,
      facturadoMes: facturacion.total,
      avisosAbiertos: tareasHoy.length,
    };

    return {
      generadoAt: new Date().toISOString(),
      titulares,
      clientes,
      propiedades,
      contratos,
      facturacion,
      actividadReciente,
      tareasHoy,
      firmasPendientes,
    };
  }

  // -------------------------------------------------------------------------
  // Clientes por etapa y linea de negocio
  // -------------------------------------------------------------------------

  /** Embudo de clientes: totales, reparto por linea y por etapa. */
  async metricasClientes(): Promise<IClientsMetrics> {
    const filas = await this.clientDAO
      .createQueryBuilder('cliente')
      .select('cliente.lineaNegocio', 'linea')
      .addSelect('cliente.etapa', 'etapa')
      .addSelect('COUNT(*)', 'total')
      .where('cliente.estado = :estado', { estado: ClientStatus.ACTIVO })
      .groupBy('cliente.lineaNegocio')
      .addGroupBy('cliente.etapa')
      .getRawMany<{ linea: BusinessLine; etapa: ClientStage; total: string }>();

    const [total, descartados, nuevosMes, presupuesto] = await Promise.all([
      this.clientDAO.count(),
      this.clientDAO.count({ where: { estado: ClientStatus.DESCARTADO } }),
      this.contarAltasDelMes(),
      this.presupuestoMedio(),
    ]);

    const activos = filas.reduce((suma, fila) => suma + Number(fila.total), 0);

    // Reparto por linea: se pinta el pipeline completo, incluidas las etapas
    // vacias, para que el embudo se lea igual aunque no haya clientes en ellas.
    const porLinea = BusinessLineList.map((linea) => {
      const filasLinea = filas.filter((fila) => fila.linea === linea);
      const totalLinea = filasLinea.reduce(
        (suma, fila) => suma + Number(fila.total),
        0,
      );

      const etapas = getStagesByBusinessLine(linea).map((etapa) => {
        const encontrada = filasLinea.find((fila) => fila.etapa === etapa);
        const totalEtapa = encontrada ? Number(encontrada.total) : 0;
        return this.aRecuento<ClientStage>(
          etapa,
          ClientStageLabels[etapa] ?? etapa,
          totalEtapa,
          totalLinea,
        );
      });

      return {
        linea,
        label: BusinessLineLabels[linea] ?? linea,
        total: totalLinea,
        etapas,
      };
    });

    // Reparto global por etapa, de mayor a menor.
    const acumuladoEtapas = new Map<ClientStage, number>();
    for (const fila of filas) {
      acumuladoEtapas.set(
        fila.etapa,
        (acumuladoEtapas.get(fila.etapa) ?? 0) + Number(fila.total),
      );
    }

    const porEtapa = [...acumuladoEtapas.entries()]
      .map(([etapa, cantidad]) =>
        this.aRecuento<ClientStage>(
          etapa,
          ClientStageLabels[etapa] ?? etapa,
          cantidad,
          activos,
        ),
      )
      .sort((a, b) => b.total - a.total);

    return {
      total,
      activos,
      descartados,
      nuevosMes,
      porLinea,
      porEtapa,
      presupuestoMedio: presupuesto,
    };
  }

  // -------------------------------------------------------------------------
  // Inmuebles por estado
  // -------------------------------------------------------------------------

  /** Cartera de inmuebles: reparto por estado comercial y por zona. */
  async metricasPropiedades(): Promise<IPropertiesMetrics> {
    const porEstadoRaw = await this.propertyDAO
      .createQueryBuilder('inmueble')
      .select('inmueble.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('inmueble.estado')
      .getRawMany<{ estado: PropertyStatus; total: string }>();

    const porZonaRaw = await this.propertyDAO
      .createQueryBuilder('inmueble')
      .select('inmueble.zona', 'zona')
      .addSelect('COUNT(*)', 'total')
      .groupBy('inmueble.zona')
      .getRawMany<{ zona: PropertyZone; total: string }>();

    const valorRaw = await this.propertyDAO
      .createQueryBuilder('inmueble')
      .select('COALESCE(SUM(inmueble.precio), 0)', 'valor')
      .where('inmueble.estado != :traspasado', {
        traspasado: PropertyStatus.TRASPASADO,
      })
      .getRawOne<{ valor: string }>();

    const total = porEstadoRaw.reduce(
      (suma, fila) => suma + Number(fila.total),
      0,
    );

    const porEstado = PROPERTY_STATUSES.map((estado) => {
      const fila = porEstadoRaw.find((item) => item.estado === estado);
      return this.aRecuento<PropertyStatus>(
        estado,
        PropertyStatusLabels[estado] ?? estado,
        fila ? Number(fila.total) : 0,
        total,
      );
    });

    const porZona = PROPERTY_ZONES.map((zona) => {
      const fila = porZonaRaw.find((item) => item.zona === zona);
      return this.aRecuento<PropertyZone>(
        zona,
        PropertyZoneLabels[zona] ?? zona,
        fila ? Number(fila.total) : 0,
        total,
      );
    });

    const disponibles =
      porEstado.find((item) => item.clave === PropertyStatus.DISPONIBLE)
        ?.total ?? 0;

    return {
      total,
      disponibles,
      valorCartera: this.redondear(Number(valorRaw?.valor ?? 0)),
      porEstado,
      porZona,
    };
  }

  // -------------------------------------------------------------------------
  // Contratos por estado
  // -------------------------------------------------------------------------

  /** Contratos: reparto por estado y contratos a la espera de firma. */
  async metricasContratos(): Promise<IContractsMetrics> {
    const porEstadoRaw = await this.contractDAO
      .createQueryBuilder('contrato')
      .select('contrato.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('contrato.estado')
      .getRawMany<{ estado: ContractState; total: string }>();

    const total = porEstadoRaw.reduce(
      (suma, fila) => suma + Number(fila.total),
      0,
    );

    const porEstado = Object.values(ContractState).map((estado) => {
      const fila = porEstadoRaw.find((item) => item.estado === estado);
      return this.aRecuento<ContractState>(
        estado,
        ContractStateLabels[estado] ?? estado,
        fila ? Number(fila.total) : 0,
        total,
      );
    });

    const pendientesFirma = porEstado
      .filter((item) => ESTADOS_PENDIENTE_FIRMA.includes(item.clave))
      .reduce((suma, item) => suma + item.total, 0);

    const firmados =
      porEstado.find((item) => item.clave === ContractState.FIRMADO)?.total ?? 0;

    const { inicio, fin } = this.rangoMes();
    const firmadosMes = await this.contractDAO.count({
      where: {
        estado: ContractState.FIRMADO,
        firmadoAt: Between(inicio, fin),
      },
    });

    return { total, pendientesFirma, firmados, firmadosMes, porEstado };
  }

  // -------------------------------------------------------------------------
  // Facturacion del mes
  // -------------------------------------------------------------------------

  /** Totales facturados en el mes en curso y comparativa con el mes anterior. */
  async facturacionMes(): Promise<IBillingMetrics> {
    const { inicio, fin } = this.rangoMes();
    const inicioIso = this.aFechaIso(inicio);
    const finIso = this.aFechaIso(fin);

    const facturas = await this.invoiceDAO.find({
      where: { fechaEmision: Between(inicioIso, finIso) },
    });

    const vivas = facturas.filter(
      (factura) => factura.estado !== InvoiceStatus.ANULADA,
    );

    const suma = (lista: Invoice[], campo: keyof Invoice): number =>
      this.redondear(
        lista.reduce((acumulado, factura) => {
          const valor = Number(factura[campo] ?? 0);
          return acumulado + (Number.isFinite(valor) ? valor : 0);
        }, 0),
      );

    const cobrado = suma(
      vivas.filter((factura) => factura.estado === InvoiceStatus.COBRADA),
      'total',
    );
    const pendiente = suma(
      vivas.filter((factura) => factura.estado === InvoiceStatus.EMITIDA),
      'total',
    );
    const anulado = suma(
      facturas.filter((factura) => factura.estado === InvoiceStatus.ANULADA),
      'total',
    );
    const total = suma(vivas, 'total');

    // Mes anterior, para la comparativa.
    const anterior = this.rangoMes(-1);
    const facturasAnteriores = await this.invoiceDAO.find({
      where: {
        fechaEmision: Between(
          this.aFechaIso(anterior.inicio),
          this.aFechaIso(anterior.fin),
        ),
        estado: Not(InvoiceStatus.ANULADA),
      },
    });
    const totalMesAnterior = suma(facturasAnteriores, 'total');

    const variacion =
      totalMesAnterior > 0
        ? this.redondear(((total - totalMesAnterior) / totalMesAnterior) * 100, 1)
        : 0;

    return {
      mes: inicioIso.slice(0, 7),
      etiquetaMes: this.etiquetaMes(inicio),
      numeroFacturas: vivas.length,
      baseImponible: suma(vivas, 'baseImponible'),
      cuotaIva: suma(vivas, 'cuotaIva'),
      total,
      cobrado,
      pendiente,
      anulado,
      totalMesAnterior,
      variacion,
    };
  }

  // -------------------------------------------------------------------------
  // Actividad reciente
  // -------------------------------------------------------------------------

  /**
   * Ultimos apuntes del historial de clientes (llamadas, visitas, cambios de
   * etapa, altas...), de lo mas reciente a lo mas antiguo.
   */
  async actividadReciente(limite = 10): Promise<IRecentActivityItem[]> {
    const filas = await this.clientActivityDAO
      .createQueryBuilder('actividad')
      .leftJoin('actividad.client', 'cliente')
      .select([
        'actividad.id AS id',
        'actividad.tipo AS tipo',
        'actividad.descripcion AS descripcion',
        'actividad.fecha AS fecha',
        'actividad.autor AS autor',
        'actividad.clientId AS "clienteId"',
        'cliente.nombre AS "clienteNombre"',
        'cliente.apellidos AS "clienteApellidos"',
      ])
      .orderBy('actividad.fecha', 'DESC')
      .addOrderBy('actividad.id', 'DESC')
      .limit(limite)
      .getRawMany<{
        id: number;
        tipo: string;
        descripcion: string;
        fecha: Date;
        autor: string | null;
        clienteId: number;
        clienteNombre: string | null;
        clienteApellidos: string | null;
      }>();

    return filas.map((fila) => ({
      id: Number(fila.id),
      tipo: fila.tipo,
      // `fila.tipo` viene de SQL como texto libre: si un dia hay una fila con un
      // tipo que el enum no conoce, se muestra el valor crudo en vez de romper.
      tipoLabel:
        ClientActivityTypeLabels[fila.tipo as ClientActivityType] ?? fila.tipo,
      descripcion: fila.descripcion,
      fecha: fila.fecha ? new Date(fila.fecha).toISOString() : null,
      autor: fila.autor ?? null,
      clienteId: Number(fila.clienteId),
      clienteNombre:
        `${fila.clienteNombre ?? ''} ${fila.clienteApellidos ?? ''}`.trim() ||
        'Cliente sin nombre',
    }));
  }

  // -------------------------------------------------------------------------
  // Tareas de hoy y firmas pendientes
  // -------------------------------------------------------------------------

  /**
   * Avisos que reclaman atencion hoy. Los calcula el mismo motor de reglas que
   * alimenta la campana, pero aqui se devuelven al vuelo (no se persisten).
   */
  async tareasHoy(): Promise<IDashboardTask[]> {
    const coincidencias = await this.notificationRulesService.evaluarReglas();

    return coincidencias.map((hit) => ({
      clave: hit.claveRegla ?? `${hit.tipo}:${hit.entidadId ?? 0}`,
      tipo: hit.tipo,
      tipoLabel: NotificationTypeLabels[hit.tipo] ?? hit.tipo,
      titulo: hit.titulo,
      mensaje: hit.mensaje,
      prioridad: hit.prioridad,
      entidadTipo: hit.entidadTipo ?? null,
      entidadId: hit.entidadId ?? null,
      entidadNombre: hit.entidadNombre ?? null,
      enlace:
        hit.enlace ??
        (hit.entidadTipo
          ? (NotificationEntityRoutes[hit.entidadTipo] ?? null)
          : null),
      fecha: hit.fecha,
      dias: hit.dias,
    }));
  }

  /** Contratos enviados o vistos que siguen esperando la firma del cliente. */
  async listarFirmasPendientes(): Promise<IPendingSignature[]> {
    const contratos = await this.contractDAO.find({
      where: { estado: In(ESTADOS_PENDIENTE_FIRMA) },
      order: { enviadoAt: 'asc', id: 'asc' },
    });

    return contratos.map((contrato) => ({
      id: contrato.id,
      referencia: contrato.referencia,
      titulo: contrato.titulo,
      estado: contrato.estado,
      estadoLabel: ContractStateLabels[contrato.estado] ?? contrato.estado,
      clienteId: contrato.clienteId ?? null,
      clienteNombre: contrato.clienteNombre ?? null,
      destinatarioEmail: contrato.destinatarioEmail ?? null,
      enviadoAt: contrato.enviadoAt
        ? new Date(contrato.enviadoAt).toISOString()
        : null,
      diasEnEspera: contrato.enviadoAt
        ? diasDesde(new Date(contrato.enviadoAt))
        : 0,
    }));
  }

  /**
   * Vencimientos dentro de la ventana indicada: fin de vigencia de contratos y
   * facturas emitidas cuyo cobro se acerca o ya se ha pasado.
   */
  async listarVencimientos(dias = 30): Promise<IUpcomingDeadline[]> {
    const vencimientos: IUpcomingDeadline[] = [];

    const contratos = await this.contractDAO.find({
      where: { estado: ContractState.FIRMADO },
      order: { id: 'asc' },
    });

    for (const contrato of contratos) {
      const fechaFin = resolveContractEndDate(contrato.datos);
      if (!fechaFin) continue;

      const restantes = diasHasta(fechaFin);
      if (restantes > dias || restantes < -dias) continue;

      vencimientos.push({
        tipo: 'contrato',
        id: contrato.id,
        referencia: contrato.referencia,
        descripcion:
          restantes >= 0
            ? `${contrato.titulo} vence en ${restantes} día(s)`
            : `${contrato.titulo} venció hace ${Math.abs(restantes)} día(s)`,
        fecha: fechaFin.toISOString(),
        dias: restantes,
        clienteNombre: contrato.clienteNombre ?? null,
      });
    }

    const facturas = await this.invoiceDAO.find({
      where: { estado: InvoiceStatus.EMITIDA },
      order: { fechaEmision: 'asc' },
    });

    for (const factura of facturas) {
      if (!factura.fechaEmision) continue;
      const emision = new Date(`${factura.fechaEmision}T12:00:00`);
      // Se considera vencida a los 30 dias de la emision.
      const vencimiento = new Date(emision);
      vencimiento.setDate(vencimiento.getDate() + 30);

      const restantes = diasHasta(vencimiento);
      if (restantes > dias || restantes < -365) continue;

      vencimientos.push({
        tipo: 'factura',
        id: factura.id,
        referencia: factura.numero,
        descripcion:
          restantes >= 0
            ? `Cobro de ${factura.numero} previsto en ${restantes} día(s)`
            : `Cobro de ${factura.numero} atrasado ${Math.abs(restantes)} día(s)`,
        fecha: vencimiento.toISOString(),
        dias: restantes,
        clienteNombre: factura.clienteNombre ?? null,
      });
    }

    return vencimientos.sort((a, b) => a.dias - b.dias);
  }

  // -------------------------------------------------------------------------
  // Contrato con el asistente de IA (IDashboardQueries)
  // -------------------------------------------------------------------------

  /** @inheritdoc */
  async pendingSignatures(): Promise<
    IAssistantActionResult<IPendingSignature[]>
  > {
    try {
      const data = await this.listarFirmasPendientes();

      if (data.length === 0) {
        return {
          ok: true,
          mensaje: 'No hay ningún contrato pendiente de firma ahora mismo.',
          data: [],
        };
      }

      const detalle = data
        .slice(0, 5)
        .map(
          (item) =>
            `${item.referencia} (${item.clienteNombre ?? 'sin cliente'}, ${item.diasEnEspera} día(s) en espera)`,
        )
        .join('; ');

      return {
        ok: true,
        mensaje: `Hay ${data.length} contrato(s) pendiente(s) de firma: ${detalle}.`,
        data,
      };
    } catch (error) {
      this.logger.error(
        `No se pudieron listar las firmas pendientes: ${(error as Error)?.message}`,
      );
      return {
        ok: false,
        mensaje: 'No se ha podido consultar el listado de firmas pendientes.',
        data: [],
      };
    }
  }

  /** @inheritdoc */
  async upcomingDeadlines(
    dias = 30,
  ): Promise<IAssistantActionResult<IUpcomingDeadline[]>> {
    try {
      const ventana = Number.isFinite(dias) && dias > 0 ? Math.trunc(dias) : 30;
      const data = await this.listarVencimientos(ventana);

      if (data.length === 0) {
        return {
          ok: true,
          mensaje: `No hay vencimientos en los próximos ${ventana} días.`,
          data: [],
        };
      }

      const detalle = data
        .slice(0, 5)
        .map((item) => item.descripcion)
        .join('; ');

      return {
        ok: true,
        mensaje: `Hay ${data.length} vencimiento(s) en la ventana de ${ventana} días: ${detalle}.`,
        data,
      };
    } catch (error) {
      this.logger.error(
        `No se pudieron listar los vencimientos: ${(error as Error)?.message}`,
      );
      return {
        ok: false,
        mensaje: 'No se ha podido consultar el listado de vencimientos.',
        data: [],
      };
    }
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  /** Construye un recuento con su porcentaje sobre el total del grupo. */
  private aRecuento<T extends string>(
    clave: T,
    label: string,
    total: number,
    totalGrupo: number,
  ): ICount<T> {
    return {
      clave,
      label,
      total,
      porcentaje:
        totalGrupo > 0 ? this.redondear((total / totalGrupo) * 100, 1) : 0,
    };
  }

  /** Altas de clientes dentro del mes en curso. */
  private async contarAltasDelMes(): Promise<number> {
    const { inicio, fin } = this.rangoMes();
    return this.clientDAO.count({ where: { createdAt: Between(inicio, fin) } });
  }

  /** Presupuesto maximo medio de los clientes activos que lo tienen fijado. */
  private async presupuestoMedio(): Promise<number> {
    const fila = await this.clientDAO
      .createQueryBuilder('cliente')
      .select('COALESCE(AVG(cliente.presupuestoMax), 0)', 'media')
      .where('cliente.estado = :estado', { estado: ClientStatus.ACTIVO })
      .andWhere('cliente.presupuestoMax IS NOT NULL')
      .getRawOne<{ media: string }>();

    return this.redondear(Number(fila?.media ?? 0));
  }

  /**
   * Primer y ultimo instante de un mes.
   * @param desplazamiento 0 = mes en curso, -1 = mes anterior.
   */
  private rangoMes(desplazamiento = 0): { inicio: Date; fin: Date } {
    const hoy = new Date();
    const inicio = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + desplazamiento,
      1,
      0,
      0,
      0,
      0,
    );
    const fin = new Date(
      hoy.getFullYear(),
      hoy.getMonth() + desplazamiento + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return { inicio, fin };
  }

  /** Fecha en formato `YYYY-MM-DD` (el que usa `Invoice.fechaEmision`). */
  private aFechaIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /** Etiqueta del mes en espanol: `agosto de 2026`. */
  private etiquetaMes(fecha: Date): string {
    const meses = [
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
    return `${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`;
  }

  /** Redondeo a los decimales indicados (2 por defecto, importes en euros). */
  private redondear(valor: number, decimales = 2): number {
    if (!Number.isFinite(valor)) return 0;
    const factor = 10 ** decimales;
    return Math.round(valor * factor) / factor;
  }
}
