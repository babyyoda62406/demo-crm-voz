import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Not, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindAllNotificationDto } from './dto/find-all-notification.dto';
import {
  IEmitManyResult,
  IEmitNotification,
} from './interfaces/notification-emit.interface';
import {
  NotificationPriority,
  NotificationType,
} from './enums/notification-type.enum';
import {
  NotificationEntityRoutes,
  NotificationEntityType,
} from './enums/notification-entity-type.enum';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { Flag } from '../common/enums/flag.enum';

/**
 * Servicio de alertas de CRMIA.
 *
 * Es el punto unico por el que pasan todas las notificaciones: el motor de
 * reglas diario y cualquier modulo de dominio que quiera avisar a la persona usuaria
 * llaman a `emit()`.
 *
 * Se exporta desde `NotificationsModule`, asi que para usarlo desde otro
 * dominio basta con importar ese modulo e inyectar este servicio.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationDAO: Repository<Notification>,
  ) {}

  // -------------------------------------------------------------------------
  // API para el resto de dominios
  // -------------------------------------------------------------------------

  /**
   * Emite una alerta.
   *
   * Es idempotente cuando se indica `claveRegla`: si ya hay una alerta SIN LEER
   * con esa misma clave no crea otra, devuelve la existente. Asi la revision
   * diaria puede repetirse sin llenar la campana de duplicados.
   *
   * Nunca lanza: un fallo al avisar no debe tumbar la operacion de negocio que
   * lo provoco. Si algo va mal se registra en el log y se devuelve `null`.
   *
   * @param payload Datos de la alerta.
   * @returns La alerta creada (o la ya existente), o `null` si fallo.
   */
  async emit(payload: IEmitNotification): Promise<Notification | null> {
    const { notificacion } = await this.emitir(payload);
    return notificacion;
  }

  /**
   * Emision con acuse: ademas de la alerta indica si se ha dado de alta ahora
   * o si ya existia sin leer. Lo usa `emitMany()` para poder contar de verdad
   * cuantas alertas nuevas ha producido una pasada del motor de reglas.
   */
  private async emitir(
    payload: IEmitNotification,
  ): Promise<{ notificacion: Notification | null; nueva: boolean }> {
    try {
      if (payload.claveRegla) {
        const existente = await this.notificationDAO.findOne({
          where: { claveRegla: payload.claveRegla, leida: false },
        });
        if (existente) return { notificacion: existente, nueva: false };
      }

      const notificacion = this.notificationDAO.create({
        tipo: payload.tipo,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        prioridad: payload.prioridad ?? NotificationPriority.MEDIA,
        usuarioId: payload.usuarioId ?? null,
        entidadTipo: payload.entidadTipo ?? null,
        entidadId: payload.entidadId ?? null,
        entidadNombre: payload.entidadNombre ?? null,
        enlace: payload.enlace ?? this.enlacePorDefecto(payload.entidadTipo),
        claveRegla: payload.claveRegla ?? null,
        leida: false,
      });

      const guardada = await this.notificationDAO.save(notificacion);
      this.logger.log(`Alerta emitida [${guardada.tipo}] ${guardada.titulo}`);
      return { notificacion: guardada, nueva: true };
    } catch (error) {
      this.logger.error(
        `No se pudo emitir la alerta "${payload.titulo}": ${(error as Error)?.message}`,
      );
      return { notificacion: null, nueva: false };
    }
  }

  /**
   * Emite varias alertas de una tacada respetando la deduplicacion de `emit()`.
   *
   * Ademas de crear las que faltan, REESCRIBE el texto de las que ya existian
   * sin leer. Sin esto la campana ensena las cifras del dia en que se creo la
   * alerta («vence dentro de 18 dias») mientras el cuadro de mando, que calcula
   * al vuelo, ensena las de hoy («dentro de 6 dias»): dos numeros distintos
   * para el mismo contrato en la misma pantalla.
   *
   * @returns `creadas` (altas reales de esta pasada), `actualizadas` (las que ya
   *          estaban y se han puesto al dia) y `reutilizadas` (las que ya
   *          estaban sin leer y no ha hecho falta tocar).
   */
  async emitMany(payloads: IEmitNotification[]): Promise<IEmitManyResult> {
    const creadas: Notification[] = [];
    const actualizadas: Notification[] = [];
    const reutilizadas: Notification[] = [];

    for (const payload of payloads) {
      const { notificacion, nueva } = await this.emitir(payload);
      if (!notificacion) continue;

      if (nueva) {
        creadas.push(notificacion);
        continue;
      }

      const puestaAlDia = await this.refrescarTexto(notificacion, payload);
      if (puestaAlDia) actualizadas.push(notificacion);
      else reutilizadas.push(notificacion);
    }

    return { creadas, actualizadas, reutilizadas };
  }

  /**
   * Pone al dia el texto de una alerta ya persistida con la redaccion que acaba
   * de componer el motor de reglas.
   *
   * Solo escribe si algo ha cambiado de verdad: asi la revision diaria no toca
   * la base de datos cuando no hay novedad.
   *
   * @returns `true` si la alerta se ha reescrito.
   */
  private async refrescarTexto(
    notificacion: Notification,
    payload: IEmitNotification,
  ): Promise<boolean> {
    const prioridad = payload.prioridad ?? NotificationPriority.MEDIA;
    const entidadNombre = payload.entidadNombre ?? null;

    const cambia =
      notificacion.titulo !== payload.titulo ||
      notificacion.mensaje !== payload.mensaje ||
      notificacion.prioridad !== prioridad ||
      notificacion.entidadNombre !== entidadNombre;

    if (!cambia) return false;

    notificacion.titulo = payload.titulo;
    notificacion.mensaje = payload.mensaje;
    notificacion.prioridad = prioridad;
    notificacion.entidadNombre = entidadNombre;
    notificacion.actualizadaAt = new Date();

    await this.notificationDAO.save(notificacion);
    return true;
  }

  /**
   * Cierra las alertas automaticas cuya condicion ya no se cumple.
   *
   * Una alerta de regla vive mientras la regla la siga detectando. Cuando la
   * factura se cobra, el contrato se firma o el cliente avanza de etapa, la
   * coincidencia desaparece y la alerta debe salir de la campana sola; si no,
   * el badge acumula avisos resueltos para siempre y deja de coincidir con los
   * avisos del cuadro de mando.
   *
   * No se borra la fila: se marca leida con la fecha y el motivo del cierre,
   * para que el aviso siga siendo consultable en el listado.
   *
   * @param clavesVivas Claves de regla que la ultima pasada SI ha detectado.
   * @param tipos Tipos de alerta que gobierna quien llama. Acotar por tipo evita
   *        que esta pasada cierre alertas de otro dominio que tambien usen
   *        `claveRegla` para deduplicar: solo cierra lo que sabe recalcular.
   * @param motivo Explicacion que se guarda en la alerta cerrada.
   * @returns Numero de alertas cerradas.
   */
  async cerrarObsoletas(
    clavesVivas: string[],
    tipos: NotificationType[],
    motivo = 'La condición que originó el aviso ya no se cumple',
  ): Promise<number> {
    if (tipos.length === 0) return 0;
    const vivas = new Set(clavesVivas);

    // Solo se consideran las automaticas: los recordatorios que escribe una
    // persona (sin `claveRegla`) no los cierra nadie mas que ella.
    const candidatas = await this.notificationDAO.find({
      where: { leida: false, claveRegla: Not(IsNull()), tipo: In(tipos) },
      select: ['id', 'claveRegla'],
    });

    const obsoletas = candidatas.filter(
      (alerta) => !vivas.has(alerta.claveRegla),
    );

    if (obsoletas.length === 0) return 0;

    const ahora = new Date();
    await this.notificationDAO.update(
      { id: In(obsoletas.map((alerta) => alerta.id)) },
      { leida: true, leidaAt: ahora, cerradaAt: ahora, motivoCierre: motivo },
    );

    this.logger.log(
      `${obsoletas.length} alerta(s) cerrada(s) por dejar de cumplirse su condición`,
    );

    return obsoletas.length;
  }

  // -------------------------------------------------------------------------
  // Consulta
  // -------------------------------------------------------------------------

  /**
   * Lista las alertas visibles por un usuario: las suyas y las generales.
   * @param dto Filtros y paginacion.
   * @param usuarioId Usuario que consulta. `undefined` = todas.
   */
  async findAll(
    dto: FindAllNotificationDto,
    usuarioId?: number,
  ): Promise<ItFindAllResponse<Notification>> {
    const { page = 1, size = 10, leida, tipo, entidadTipo } = dto;

    const base: FindOptionsWhere<Notification> = {};
    if (leida !== undefined) base.leida = leida;
    if (tipo) base.tipo = tipo;
    if (entidadTipo) base.entidadTipo = entidadTipo;

    // Cada usuario ve sus alertas y las generales (sin destinatario).
    const where: FindOptionsWhere<Notification>[] = usuarioId
      ? [
          { ...base, usuarioId },
          { ...base, usuarioId: IsNull() },
        ]
      : [base];

    const total = await this.notificationDAO.count({ where });
    const data = await this.notificationDAO.find({
      where,
      skip: (page - 1) * size,
      take: size,
      order: { leida: 'asc', createdAt: 'desc' },
    });

    return {
      data,
      metadata: {
        records: total,
        frame: page,
        frameSize: size,
        lastFrame: Math.ceil(total / size) || 1,
      },
    };
  }

  /** Numero de alertas sin leer visibles por el usuario (badge de la campana). */
  async countUnread(usuarioId?: number): Promise<number> {
    return this.notificationDAO.count({ where: this.dondeSinLeer(usuarioId) });
  }

  /**
   * Contador de la campana desglosado por origen.
   *
   * La campana y la tarjeta «Avisos abiertos» del cuadro de mando no cuentan lo
   * mismo por diseno: el panel solo pinta los avisos que produce el motor de
   * reglas, mientras que la campana ensena ademas los recordatorios que escribe
   * una persona. Devolver el desglose permite cuadrar las dos cifras sin
   * adivinar: `automaticas` es el numero que debe coincidir con el panel.
   *
   * @returns `noLeidas` (badge), `automaticas` (de regla) y `manuales`.
   */
  async countUnreadDesglosado(usuarioId?: number): Promise<{
    noLeidas: number;
    automaticas: number;
    manuales: number;
  }> {
    const donde = this.dondeSinLeer(usuarioId);

    const automaticas = await this.notificationDAO.count({
      where: donde.map((filtro) => ({ ...filtro, claveRegla: Not(IsNull()) })),
    });
    const manuales = await this.notificationDAO.count({
      where: donde.map((filtro) => ({ ...filtro, claveRegla: IsNull() })),
    });

    return { noLeidas: automaticas + manuales, automaticas, manuales };
  }

  /** Filtro de «sin leer» visible por el usuario: las suyas y las generales. */
  private dondeSinLeer(usuarioId?: number): FindOptionsWhere<Notification>[] {
    return usuarioId
      ? [
          { leida: false, usuarioId },
          { leida: false, usuarioId: IsNull() },
        ]
      : [{ leida: false }];
  }

  /**
   * Devuelve las ultimas alertas sin leer, para pintar el desplegable y el
   * panel de avisos del cuadro de mando.
   */
  async findUnread(limite = 10, usuarioId?: number): Promise<Notification[]> {
    return this.notificationDAO.find({
      where: this.dondeSinLeer(usuarioId),
      take: limite,
      order: { prioridad: 'asc', createdAt: 'desc' },
    });
  }

  /** Recupera una alerta por su identificador. */
  async findOne(id: number): Promise<Notification> {
    const notificacion = await this.notificationDAO.findOne({ where: { id } });

    if (!notificacion) {
      throw new HttpException(
        { message: 'La alerta no existe', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return notificacion;
  }

  // -------------------------------------------------------------------------
  // Escritura
  // -------------------------------------------------------------------------

  /** Alta manual de una alerta desde la API. */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notificacion = await this.emit(dto);

    if (!notificacion) {
      throw new HttpException(
        { message: 'No se pudo crear la alerta', flag: Flag.DATABASE_ERROR },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return notificacion;
  }

  /** Marca una alerta como leida (idempotente). */
  async markAsRead(id: number): Promise<Notification> {
    const notificacion = await this.findOne(id);

    if (notificacion.leida) return notificacion;

    notificacion.leida = true;
    notificacion.leidaAt = new Date();
    return this.notificationDAO.save(notificacion);
  }

  /** Devuelve una alerta al estado de no leida. */
  async markAsUnread(id: number): Promise<Notification> {
    const notificacion = await this.findOne(id);

    notificacion.leida = false;
    notificacion.leidaAt = null;
    return this.notificationDAO.save(notificacion);
  }

  /**
   * Marca como leidas todas las alertas visibles por el usuario.
   * @returns Numero de alertas afectadas.
   */
  async markAllAsRead(usuarioId?: number): Promise<number> {
    const pendientes = await this.notificationDAO.find({
      where: this.dondeSinLeer(usuarioId),
      select: ['id'],
    });

    if (pendientes.length === 0) return 0;

    await this.notificationDAO.update(
      { id: In(pendientes.map((alerta) => alerta.id)) },
      { leida: true, leidaAt: new Date() },
    );

    return pendientes.length;
  }

  /** Elimina una alerta. */
  async remove(id: number): Promise<void> {
    const notificacion = await this.findOne(id);
    await this.notificationDAO.remove(notificacion);
  }

  /**
   * Elimina las alertas indicadas y devuelve cuantas se han borrado de verdad.
   * A diferencia de `remove()`, un id que ya no existe no es un error: lo usa la
   * retirada de datos de demostracion, que trabaja sobre un inventario que pudo
   * quedarse desfasado.
   */
  async removeMany(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { affected } = await this.notificationDAO.delete(ids);
    return affected ?? 0;
  }

  /** Borra todas las alertas. Lo usa la semilla de demo al reiniciar. */
  async removeAll(): Promise<void> {
    await this.notificationDAO.clear();
  }

  /** Inserta alertas de ejemplo saltandose la deduplicacion (semilla de demo). */
  async createRaw(
    payloads: (IEmitNotification & { leida?: boolean; createdAt?: Date })[],
  ): Promise<Notification[]> {
    const entidades = payloads.map((payload) =>
      this.notificationDAO.create({
        tipo: payload.tipo,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        prioridad: payload.prioridad ?? NotificationPriority.MEDIA,
        usuarioId: payload.usuarioId ?? null,
        entidadTipo: payload.entidadTipo ?? null,
        entidadId: payload.entidadId ?? null,
        entidadNombre: payload.entidadNombre ?? null,
        enlace: payload.enlace ?? this.enlacePorDefecto(payload.entidadTipo),
        claveRegla: payload.claveRegla ?? null,
        leida: payload.leida ?? false,
        leidaAt: payload.leida ? new Date() : null,
      }),
    );

    const guardadas = await this.notificationDAO.save(entidades);

    // `createdAt` lo escribe TypeORM al insertar: para que la demo muestre
    // alertas repartidas en el tiempo hay que reescribirlo despues.
    for (let i = 0; i < guardadas.length; i++) {
      const fecha = payloads[i]?.createdAt;
      if (!fecha) continue;
      await this.notificationDAO
        .createQueryBuilder()
        .update(Notification)
        .set({ createdAt: fecha })
        .where('id = :id', { id: guardadas[i].id })
        .execute();
    }

    return guardadas;
  }

  /** Alertas del tipo indicado, de la mas reciente a la mas antigua. */
  async findByType(
    tipo: NotificationType,
    limite = 20,
  ): Promise<Notification[]> {
    return this.notificationDAO.find({
      where: { tipo },
      take: limite,
      order: { createdAt: 'desc' },
    });
  }

  // -------------------------------------------------------------------------
  // Internos
  // -------------------------------------------------------------------------

  /** Ruta del front asociada al dominio de la entidad relacionada. */
  private enlacePorDefecto(
    entidadTipo?: NotificationEntityType | null,
  ): string | null {
    if (!entidadTipo) return null;
    return NotificationEntityRoutes[entidadTipo] ?? null;
  }
}
