import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import {
  NotificationPriority,
  NotificationType,
} from './enums/notification-type.enum';
import { NotificationEntityType } from './enums/notification-entity-type.enum';
import { IRuleHit } from './interfaces/rule-hit.interface';
import { IRulesRunResult } from './interfaces/notification-emit.interface';
import {
  diasDesde,
  diasHasta,
  formatearFechaLarga,
  resolveContractEndDate,
} from './helpers/contract-dates.helper';
import { Contract } from '../contracts/entities/contract.entity';
import { ContractState } from '../contracts/enums/contract-state.enum';
import { Client } from '../clients/entities/client.entity';
import { ClientActivity } from '../clients/entities/client-activity.entity';
import { ClientStage, ClientStageLabels, ClientStatus } from '../clients/enums';
import { Invoice } from '../billing/entities/invoice.entity';
import { InvoiceStatus } from '../billing/enums/invoice-status.enum';

/** Ventana de la regla de prorroga: se avisa a 30 dias o menos del fin. */
export const DIAS_AVISO_PRORROGA = 30;
/** Dias que puede estar un contrato enviado sin que el cliente lo firme. */
export const DIAS_CONTRATO_SIN_FIRMAR = 3;
/** Dias que puede estar un lead o un briefing sin ningun movimiento. */
export const DIAS_CLIENTE_SIN_ACTIVIDAD = 7;
/** Dias desde la emision a partir de los cuales una factura se reclama. */
export const DIAS_FACTURA_VENCIDA = 30;

/**
 * Tipos de alerta que gobierna este motor.
 *
 * Es el alcance del cierre automatico: la pasada solo retira alertas de estos
 * cuatro tipos, porque son los unicos cuya condicion sabe volver a evaluar. Una
 * alerta que emita otro dominio no se toca aunque lleve `claveRegla`.
 */
const TIPOS_DE_REGLA: NotificationType[] = [
  NotificationType.AVISO_PRORROGA,
  NotificationType.CONTRATO_SIN_FIRMAR,
  NotificationType.CLIENTE_SIN_ACTIVIDAD,
  NotificationType.FACTURA_VENCIDA,
];

/** Plantillas cuyo contrato tiene vencimiento y, por tanto, admite prorroga. */
const PLANTILLAS_CON_VENCIMIENTO = [
  'alquiler-temporal',
  'prorroga',
  'anexo-inquilino',
];

/** Etapas iniciales del embudo que se vigilan por inactividad. */
const ETAPAS_VIGILADAS: ClientStage[] = [
  ClientStage.LEAD,
  ClientStage.BRIEFING,
  ClientStage.INTERESADA,
  ClientStage.PREVISTA,
];

/**
 * Motor de reglas de aviso de CRMIA.
 *
 * Se ejecuta cada dia a las 8:00 y tambien a peticion desde
 * `POST /api/notifications/revisar`. Las coincidencias que detecta alimentan
 * dos sitios a la vez:
 *  - la campana de la barra superior (se persisten como `Notification`);
 *  - la lista de «tareas de hoy» del cuadro de mando (se calculan al vuelo).
 *
 * Cada aviso lleva una `claveRegla` estable (`tipo:entidad:id`), de modo que
 * repetir la revision no genera duplicados mientras la alerta siga sin leer.
 *
 * Las dos vistas se mantienen cuadradas porque la pasada no solo crea: tambien
 * reescribe los plazos de las alertas vigentes y cierra las que ya no detecta.
 * Sin ese mantenimiento la campana acumula avisos resueltos y con cifras
 * congeladas mientras el panel, que calcula al vuelo, ensena otra cosa.
 */
@Injectable()
export class NotificationRulesService {
  private readonly logger = new Logger(NotificationRulesService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Contract)
    private readonly contractDAO: Repository<Contract>,
    @InjectRepository(Client)
    private readonly clientDAO: Repository<Client>,
    @InjectRepository(ClientActivity)
    private readonly clientActivityDAO: Repository<ClientActivity>,
    @InjectRepository(Invoice)
    private readonly invoiceDAO: Repository<Invoice>,
  ) {}

  // -------------------------------------------------------------------------
  // Disparadores
  // -------------------------------------------------------------------------

  /**
   * Revision diaria automatica, todos los dias a las 8:00 (hora del servidor).
   * `ScheduleModule.forRoot()` ya esta registrado en `AppModule`.
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'revision-diaria-alertas' })
  async revisionDiaria(): Promise<void> {
    try {
      const resultado = await this.ejecutarReglas();
      this.logger.log(
        `Revisión diaria completada: ${resultado.total} alerta(s) nueva(s), ${resultado.actualizadas} puesta(s) al día y ${resultado.cerradas} cerrada(s), de ${resultado.detectadas} aviso(s) vigente(s)`,
      );
    } catch (error) {
      this.logger.error(
        `La revisión diaria de alertas ha fallado: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
    }
  }

  /**
   * Evalua las reglas y deja la campana en el estado que describen: da de alta
   * lo nuevo, pone al dia lo que sigue vigente y CIERRA lo que ya se resolvio.
   *
   * Los recuentos cuentan altas REALES, no coincidencias: `emit()` deduplica
   * por `claveRegla` mientras la alerta siga sin leer, asi que repetir la
   * revision el mismo dia devuelve `total: 0` con `detectadas` intacto. Contar
   * las coincidencias haria que la pantalla anunciara alertas nuevas que no
   * existen.
   *
   * El cierre es lo que mantiene cuadrada la campana con el cuadro de mando: el
   * panel calcula sus avisos al vuelo, asi que en cuanto una factura se cobra o
   * un contrato se firma el aviso desaparece del panel. Si la alerta persistida
   * no se retirara, el badge seguiria contandola para siempre.
   *
   * @returns Recuento de alertas creadas, cerradas, actualizadas y detectadas.
   */
  async ejecutarReglas(): Promise<IRulesRunResult> {
    const coincidencias = await this.evaluarReglas();
    const { creadas, actualizadas } =
      await this.notificationsService.emitMany(coincidencias);

    // Todo aviso automatico que no este entre las coincidencias de hoy es un
    // aviso resuelto: sale de la campana con su motivo, sin borrar la fila.
    const clavesVivas = coincidencias
      .map((hit) => hit.claveRegla)
      .filter((clave): clave is string => Boolean(clave));
    const cerradas = await this.notificationsService.cerrarObsoletas(
      clavesVivas,
      TIPOS_DE_REGLA,
    );

    // Las alertas de regla siempre llevan `claveRegla`, que es lo que permite
    // atribuir cada alta nueva a la regla que la produjo.
    const clavesNuevas = new Set(
      creadas.map((alerta) => alerta.claveRegla).filter(Boolean),
    );

    const contarPor = (tipo: NotificationType): number =>
      coincidencias.filter(
        (hit) =>
          hit.tipo === tipo && hit.claveRegla && clavesNuevas.has(hit.claveRegla),
      ).length;

    return {
      ejecutadoAt: new Date(),
      avisosProrroga: contarPor(NotificationType.AVISO_PRORROGA),
      contratosSinFirmar: contarPor(NotificationType.CONTRATO_SIN_FIRMAR),
      clientesSinActividad: contarPor(NotificationType.CLIENTE_SIN_ACTIVIDAD),
      facturasVencidas: contarPor(NotificationType.FACTURA_VENCIDA),
      total: creadas.length,
      detectadas: coincidencias.length,
      cerradas,
      actualizadas: actualizadas.length,
      idsCreados: creadas.map((alerta) => alerta.id),
    };
  }

  /**
   * Evalua las cuatro reglas sin escribir nada en la base de datos.
   * Lo usa el cuadro de mando para la lista de tareas del dia.
   *
   * @returns Coincidencias ordenadas por urgencia (lo mas apremiante primero).
   */
  async evaluarReglas(): Promise<IRuleHit[]> {
    const [prorrogas, sinFirmar, inactivos, facturas] = await Promise.all([
      this.reglaProrrogas(),
      this.reglaContratosSinFirmar(),
      this.reglaClientesSinActividad(),
      this.reglaFacturasVencidas(),
    ]);

    const orden: Record<NotificationPriority, number> = {
      [NotificationPriority.ALTA]: 0,
      [NotificationPriority.MEDIA]: 1,
      [NotificationPriority.BAJA]: 2,
    };

    return [...prorrogas, ...sinFirmar, ...inactivos, ...facturas].sort(
      (a, b) => {
        const porPrioridad =
          orden[a.prioridad ?? NotificationPriority.MEDIA] -
          orden[b.prioridad ?? NotificationPriority.MEDIA];
        return porPrioridad !== 0 ? porPrioridad : a.dias - b.dias;
      },
    );
  }

  // -------------------------------------------------------------------------
  // Regla 1 — aviso de prorroga (30 dias)
  // -------------------------------------------------------------------------

  /**
   * Contratos de alquiler firmados cuyo vencimiento cae dentro de los proximos
   * 30 dias (o que acaban de vencer): hay que ofrecer prorroga al cliente.
   */
  async reglaProrrogas(): Promise<IRuleHit[]> {
    const contratos = await this.contractDAO.find({
      where: {
        estado: ContractState.FIRMADO,
        templateKey: In(PLANTILLAS_CON_VENCIMIENTO),
      },
      order: { id: 'asc' },
    });

    const coincidencias: IRuleHit[] = [];

    for (const contrato of contratos) {
      const fechaFin = resolveContractEndDate(contrato.datos);
      if (!fechaFin) continue;

      const dias = diasHasta(fechaFin);
      // Ventana: desde 30 dias antes del fin hasta 30 dias despues.
      if (dias > DIAS_AVISO_PRORROGA || dias < -DIAS_AVISO_PRORROGA) continue;

      const vencido = dias < 0;
      const cliente = contrato.clienteNombre ?? 'cliente sin asignar';
      const mensaje = vencido
        ? `El contrato ${contrato.referencia} de ${cliente} venció el ${formatearFechaLarga(fechaFin)} (hace ${Math.abs(dias)} día(s)). Confirma la prórroga o cierra el expediente.`
        : `El contrato ${contrato.referencia} de ${cliente} vence el ${formatearFechaLarga(fechaFin)} (dentro de ${dias} día(s)). Prepara la prórroga.`;

      coincidencias.push({
        tipo: NotificationType.AVISO_PRORROGA,
        titulo: vencido
          ? `Contrato vencido: ${contrato.referencia}`
          : `Aviso de prórroga: ${contrato.referencia}`,
        mensaje,
        prioridad:
          vencido || dias <= 7
            ? NotificationPriority.ALTA
            : NotificationPriority.MEDIA,
        entidadTipo: NotificationEntityType.CONTRATO,
        entidadId: contrato.id,
        entidadNombre: contrato.referencia,
        claveRegla: `${NotificationType.AVISO_PRORROGA}:contrato:${contrato.id}`,
        fecha: fechaFin.toISOString(),
        dias,
      });
    }

    return coincidencias;
  }

  // -------------------------------------------------------------------------
  // Regla 2 — contratos enviados y sin firmar
  // -------------------------------------------------------------------------

  /**
   * Contratos enviados a firma (o ya abiertos por el cliente) que llevan tres
   * dias o mas sin firmarse.
   */
  async reglaContratosSinFirmar(): Promise<IRuleHit[]> {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_CONTRATO_SIN_FIRMAR);

    const contratos = await this.contractDAO.find({
      where: {
        estado: In([ContractState.ENVIADO, ContractState.VISTO]),
        enviadoAt: LessThanOrEqual(limite),
      },
      order: { enviadoAt: 'asc' },
    });

    return contratos.map((contrato) => {
      const dias = diasDesde(new Date(contrato.enviadoAt));
      const cliente = contrato.clienteNombre ?? 'el cliente';
      const visto = contrato.estado === ContractState.VISTO;

      return {
        tipo: NotificationType.CONTRATO_SIN_FIRMAR,
        titulo: `Sin firmar: ${contrato.referencia}`,
        mensaje: visto
          ? `${cliente} abrió el contrato ${contrato.referencia} pero no lo ha firmado. Enviado hace ${dias} día(s).`
          : `El contrato ${contrato.referencia} se envió a ${cliente} hace ${dias} día(s) y sigue sin firmar. Conviene hacer seguimiento.`,
        prioridad:
          dias >= 7 ? NotificationPriority.ALTA : NotificationPriority.MEDIA,
        entidadTipo: NotificationEntityType.CONTRATO,
        entidadId: contrato.id,
        entidadNombre: contrato.referencia,
        claveRegla: `${NotificationType.CONTRATO_SIN_FIRMAR}:contrato:${contrato.id}`,
        fecha: new Date(contrato.enviadoAt).toISOString(),
        dias: -dias,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Regla 3 — clientes en etapa inicial sin actividad
  // -------------------------------------------------------------------------

  /**
   * Clientes activos parados en las primeras etapas del embudo (lead, briefing
   * y sus equivalentes en las otras lineas) que llevan siete dias o mas sin
   * ningun apunte en su historial.
   */
  async reglaClientesSinActividad(): Promise<IRuleHit[]> {
    const clientes = await this.clientDAO.find({
      where: {
        estado: ClientStatus.ACTIVO,
        etapa: In(ETAPAS_VIGILADAS),
      },
      order: { id: 'asc' },
    });

    if (clientes.length === 0) return [];

    const ultimaActividad = await this.ultimaActividadPorCliente(
      clientes.map((cliente) => cliente.id),
    );

    const coincidencias: IRuleHit[] = [];

    for (const cliente of clientes) {
      const referencia = ultimaActividad.get(cliente.id) ?? cliente.createdAt;
      if (!referencia) continue;

      const dias = diasDesde(new Date(referencia));
      if (dias < DIAS_CLIENTE_SIN_ACTIVIDAD) continue;

      const nombre =
        `${cliente.nombre ?? ''} ${cliente.apellidos ?? ''}`.trim() ||
        'Cliente sin nombre';
      const etapa = ClientStageLabels[cliente.etapa] ?? cliente.etapa;

      coincidencias.push({
        tipo: NotificationType.CLIENTE_SIN_ACTIVIDAD,
        titulo: `Sin seguimiento: ${nombre}`,
        mensaje: `${nombre} lleva ${dias} día(s) en la etapa «${etapa}» sin ningún movimiento. Retoma el contacto.`,
        prioridad:
          dias >= 14 ? NotificationPriority.ALTA : NotificationPriority.MEDIA,
        entidadTipo: NotificationEntityType.CLIENTE,
        entidadId: cliente.id,
        entidadNombre: nombre,
        claveRegla: `${NotificationType.CLIENTE_SIN_ACTIVIDAD}:cliente:${cliente.id}`,
        fecha: new Date(referencia).toISOString(),
        dias: -dias,
      });
    }

    return coincidencias;
  }

  // -------------------------------------------------------------------------
  // Regla 4 — facturas pendientes de cobro
  // -------------------------------------------------------------------------

  /** Facturas emitidas hace 30 dias o mas que siguen sin cobrarse. */
  async reglaFacturasVencidas(): Promise<IRuleHit[]> {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_FACTURA_VENCIDA);
    const limiteIso = limite.toISOString().slice(0, 10);

    const facturas = await this.invoiceDAO.find({
      where: {
        estado: InvoiceStatus.EMITIDA,
        fechaEmision: LessThanOrEqual(limiteIso),
      },
      order: { fechaEmision: 'asc' },
    });

    return facturas.map((factura) => {
      const emision = new Date(`${factura.fechaEmision}T12:00:00`);
      const dias = diasDesde(emision);

      return {
        tipo: NotificationType.FACTURA_VENCIDA,
        titulo: `Cobro pendiente: ${factura.numero}`,
        mensaje: `La factura ${factura.numero} de ${factura.clienteNombre} (${this.formatearImporte(factura.total)}) se emitió hace ${dias} día(s) y sigue sin cobrar.`,
        prioridad:
          dias >= 60 ? NotificationPriority.ALTA : NotificationPriority.MEDIA,
        entidadTipo: NotificationEntityType.FACTURA,
        entidadId: factura.id,
        entidadNombre: factura.numero,
        claveRegla: `${NotificationType.FACTURA_VENCIDA}:factura:${factura.id}`,
        fecha: emision.toISOString(),
        dias: -dias,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  /** Importe en euros con formato espanol (`1.250,00 €`). */
  private formatearImporte(importe: number): string {
    const valor = Number(importe ?? 0);
    return `${valor.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  /**
   * Fecha del ultimo apunte del historial de cada cliente indicado.
   * @returns Mapa `clienteId -> fecha de la ultima actividad`.
   */
  private async ultimaActividadPorCliente(
    clienteIds: number[],
  ): Promise<Map<number, Date>> {
    const mapa = new Map<number, Date>();
    if (clienteIds.length === 0) return mapa;

    const filas = await this.clientActivityDAO
      .createQueryBuilder('actividad')
      .select('actividad.clientId', 'clientId')
      .addSelect('MAX(actividad.fecha)', 'ultima')
      .where('actividad.clientId IN (:...clienteIds)', { clienteIds })
      .groupBy('actividad.clientId')
      .getRawMany<{ clientId: number; ultima: Date }>();

    for (const fila of filas) {
      if (fila.ultima) mapa.set(Number(fila.clientId), new Date(fila.ultima));
    }

    return mapa;
  }
}
