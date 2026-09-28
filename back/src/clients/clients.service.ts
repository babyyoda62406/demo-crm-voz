import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Raw,
  Repository,
} from 'typeorm';
import { Client } from './entities/client.entity';
import { ClientActivity } from './entities/client-activity.entity';
import { User } from '../user/entities/user.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FindAllClientDto } from './dto/find-all-client.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { DiscardClientDto } from './dto/discard-client.dto';
import { CreateClientActivityDto } from './dto/create-client-activity.dto';
import { FindAllClientActivityDto } from './dto/find-all-client-activity.dto';
import { ImportClientsDto } from './dto/import-clients.dto';
import {
  BusinessLine,
  BusinessLineColors,
  BusinessLineLabels,
  BusinessLineList,
  ClientActivityType,
  ClientStage,
  ClientStageColors,
  ClientStageLabels,
  ClientStatus,
  ClientType,
  getFirstStage,
  getStagesByBusinessLine,
  InterestZone,
  InterestZoneLabels,
  InterestZoneList,
  isStageOfBusinessLine,
  normalizeStage,
  normalizeZones,
} from './enums';
import {
  getFileExtension,
  ImportedClientRow,
  mapRowToClientInput,
  parseImportFile,
  SUPPORTED_IMPORT_EXTENSIONS,
  UploadedImportFile,
} from './helpers/client-import.helper';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { Flag } from '../common/enums/flag.enum';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import {
  EntityRef,
  IAssistantActionResult,
  IClientActions,
  ICreateClientInput,
  IFindClientsFilter,
} from '../common/contracts/assistant-actions';

/** Quien ejecuta la accion, ya resuelto a un nombre presentable. */
interface ActorInfo {
  id?: number;
  nombre: string;
}

/** Una columna del kanban. */
export interface KanbanColumnDto {
  id: ClientStage;
  label: string;
  color: string;
}

/** Respuesta del tablero kanban de una linea de negocio. */
export interface KanbanBoardDto {
  lineaNegocio: BusinessLine;
  lineaNegocioLabel: string;
  columnas: KanbanColumnDto[];
  clientes: Client[];
}

/** Catalogo de etapas de una linea de negocio. */
export interface StageCatalogDto {
  lineaNegocio: BusinessLine;
  label: string;
  color: string;
  etapas: KanbanColumnDto[];
}

/** Resultado de una importacion CSV / Excel. */
export interface ImportClientsSummaryDto {
  totalFilas: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  errores: { fila: number; motivo: string }[];
}

/** Etiquetas de los campos de la ficha, para redactar el historial de cambios. */
const FIELD_LABELS: Partial<Record<keyof Client, string>> = {
  nombre: 'nombre',
  apellidos: 'apellidos',
  email: 'correo electrónico',
  telefono: 'teléfono',
  documento: 'documento',
  tipo: 'tipo de cliente',
  lineaNegocio: 'línea de negocio',
  etapa: 'etapa',
  presupuestoMin: 'presupuesto mínimo',
  presupuestoMax: 'presupuesto máximo',
  zonasInteres: 'zonas de interés',
  tipoOperacion: 'tipo de operación',
  origen: 'origen',
  notas: 'notas',
  responsableId: 'responsable',
};

/** Tope de tarjetas que se cargan de una vez en el kanban. */
const KANBAN_MAX_CARDS = 500;

@Injectable()
export class ClientsService implements IClientActions {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientDAO: Repository<Client>,
    @InjectRepository(ClientActivity)
    private readonly clientActivityDAO: Repository<ClientActivity>,
    @InjectRepository(User)
    private readonly userDAO: Repository<User>,
  ) {}

  // =========================================================================
  // CRUD
  // =========================================================================

  /**
   * Da de alta un cliente y abre su historial con un apunte de tipo `alta`.
   *
   * @param dto Datos del alta.
   * @param user Usuario autenticado (para el responsable y la autoría).
   * @param origenActividad Tipo de apunte inicial (`alta` o `importacion`).
   */
  async create(
    dto: CreateClientDto,
    user?: ItJwtPayload,
    origenActividad: ClientActivityType = ClientActivityType.ALTA,
  ): Promise<Client> {
    const lineaNegocio = dto.lineaNegocio ?? BusinessLine.PSI;
    const etapa = this.resolveStageOrFail(dto.etapa, lineaNegocio);
    this.assertBudgetRange(dto.presupuestoMin, dto.presupuestoMax);

    if (dto.email) {
      const duplicated = await this.clientDAO.findOne({
        where: { email: dto.email },
      });
      if (duplicated) {
        throw new HttpException(
          {
            message: `Ya existe un cliente con el correo ${dto.email}`,
            flag: Flag.CONFLICT,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const actor = await this.resolveActor(user);
    const client = this.clientDAO.create({
      ...dto,
      lineaNegocio,
      etapa,
      tipo: dto.tipo ?? ClientType.INVERSOR,
      zonasInteres: dto.zonasInteres ?? [],
      estado: ClientStatus.ACTIVO,
      responsableId: dto.responsableId ?? actor.id ?? null,
    });

    const savedClient = await this.clientDAO.save(client);
    this.logger.log(`Cliente creado: ${savedClient.id} - ${savedClient.nombre}`);

    await this.registrarActividad(
      savedClient.id,
      origenActividad,
      origenActividad === ClientActivityType.IMPORTACION
        ? 'Cliente creado mediante importación de fichero.'
        : `Alta del cliente en la línea ${BusinessLineLabels[lineaNegocio]}, etapa ${ClientStageLabels[etapa]}.`,
      actor,
    );

    return this.findOne(savedClient.id);
  }

  /**
   * Listado paginado con filtros. Si no se indica `estado`, solo devuelve los
   * clientes activos: los descartados tienen su propia vista.
   */
  async findAll(dto: FindAllClientDto): Promise<ItFindAllResponse<Client>> {
    const {
      page = 1,
      size = 10,
      search,
      tipo,
      lineaNegocio,
      etapa,
      estado,
      zona,
      tipoOperacion,
      presupuestoDesde,
      presupuestoHasta,
      responsableId,
    } = dto;

    const base: FindOptionsWhere<Client> = {
      estado: estado ?? ClientStatus.ACTIVO,
    };

    if (tipo) base.tipo = tipo;
    if (lineaNegocio) base.lineaNegocio = lineaNegocio;
    if (tipoOperacion) base.tipoOperacion = tipoOperacion;
    if (responsableId) base.responsableId = responsableId;

    if (etapa) {
      const etapaNormalizada = normalizeStage(etapa, lineaNegocio);
      // Una etapa que no existe no debe devolver "todo": se fuerza el vacío.
      base.etapa = etapaNormalizada ?? (`__desconocida__` as ClientStage);
    }

    if (zona) {
      // `zonasInteres` es un `simple-array`: en base de datos es una cadena con
      // las zonas separadas por comas, así que se busca por coincidencia.
      (base as Record<string, unknown>).zonasInteres = Raw(
        (alias) => `${alias} ILIKE :zona`,
        { zona: `%${zona}%` },
      );
    }

    // Solapamiento de rangos: el presupuesto del cliente cruza el buscado.
    if (presupuestoDesde !== undefined) {
      base.presupuestoMax = MoreThanOrEqual(presupuestoDesde);
    }
    if (presupuestoHasta !== undefined) {
      base.presupuestoMin = LessThanOrEqual(presupuestoHasta);
    }

    const where: FindOptionsWhere<Client> | FindOptionsWhere<Client>[] = search
      ? [
          { ...base, nombre: ILike(`%${search}%`) },
          { ...base, apellidos: ILike(`%${search}%`) },
          { ...base, email: ILike(`%${search}%`) },
          { ...base, telefono: ILike(`%${search}%`) },
          { ...base, documento: ILike(`%${search}%`) },
        ]
      : base;

    const total = await this.clientDAO.count({ where });
    const data = await this.clientDAO.find({
      where,
      skip: (page - 1) * size,
      take: size,
      relations: ['responsable'],
      order: { updatedAt: 'DESC', id: 'DESC' },
    });

    return {
      data: data.map((client) => this.stripSensitive(client)),
      metadata: {
        records: total,
        frame: page,
        frameSize: size,
        lastFrame: Math.ceil(total / size) || 1,
      },
    };
  }

  /** Ficha completa del cliente, con su historial ordenado de lo más reciente. */
  async findOne(id: number): Promise<Client> {
    const client = await this.clientDAO.findOne({
      where: { id },
      relations: ['responsable'],
    });

    if (!client) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    client.actividades = await this.clientActivityDAO.find({
      where: { clientId: id },
      order: { fecha: 'DESC', id: 'DESC' },
      take: 100,
    });

    return this.stripSensitive(client);
  }

  /** Actualiza la ficha y deja constancia de los campos modificados. */
  async update(
    id: number,
    dto: UpdateClientDto,
    user?: ItJwtPayload,
  ): Promise<Client> {
    const client = await this.clientDAO.findOne({ where: { id } });

    if (!client) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const lineaNegocio = dto.lineaNegocio ?? client.lineaNegocio;
    this.assertBudgetRange(
      dto.presupuestoMin ?? client.presupuestoMin,
      dto.presupuestoMax ?? client.presupuestoMax,
    );

    if (dto.email && dto.email !== client.email) {
      const duplicated = await this.clientDAO.findOne({
        where: { email: dto.email },
      });
      if (duplicated && duplicated.id !== id) {
        throw new HttpException(
          {
            message: `Ya existe un cliente con el correo ${dto.email}`,
            flag: Flag.CONFLICT,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    // Si cambia la línea de negocio, la etapa debe seguir siendo válida en ella.
    let etapa = client.etapa;
    if (dto.etapa !== undefined) {
      etapa = this.resolveStageOrFail(dto.etapa, lineaNegocio);
    } else if (!isStageOfBusinessLine(client.etapa, lineaNegocio)) {
      etapa = getFirstStage(lineaNegocio);
    }

    const cambios = this.describirCambios(client, { ...dto, lineaNegocio, etapa });

    Object.assign(client, dto, { lineaNegocio, etapa });
    await this.clientDAO.save(client);
    this.logger.log(`Cliente actualizado: ${client.id}`);

    if (cambios.length) {
      const actor = await this.resolveActor(user);
      await this.registrarActividad(
        client.id,
        ClientActivityType.ACTUALIZACION,
        `Ficha actualizada: ${cambios.join(', ')}.`,
        actor,
      );
    }

    return this.findOne(client.id);
  }

  /** Borrado definitivo del cliente y de su historial (cascada). */
  async remove(id: number): Promise<void> {
    const client = await this.clientDAO.findOne({ where: { id } });

    if (!client) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.clientDAO.remove(client);
    this.logger.log(`Cliente eliminado: ${id}`);
  }

  // =========================================================================
  // Kanban y pipeline
  // =========================================================================

  /**
   * Mueve un cliente de columna en el kanban.
   * Admite cambiar de línea de negocio en el mismo movimiento.
   */
  async moveStage(
    id: number,
    dto: MoveStageDto,
    user?: ItJwtPayload,
  ): Promise<Client> {
    const client = await this.clientDAO.findOne({ where: { id } });

    if (!client) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    const lineaNegocio = dto.lineaNegocio ?? client.lineaNegocio;
    const etapaDestino = this.resolveStageOrFail(dto.etapa, lineaNegocio, true);

    if (
      etapaDestino === client.etapa &&
      lineaNegocio === client.lineaNegocio
    ) {
      return this.findOne(client.id);
    }

    const etapaOrigen = client.etapa;
    const lineaOrigen = client.lineaNegocio;

    client.etapa = etapaDestino;
    client.lineaNegocio = lineaNegocio;
    await this.clientDAO.save(client);

    const actor = await this.resolveActor(user);
    const cambioDeLinea =
      lineaOrigen !== lineaNegocio
        ? ` (línea ${BusinessLineLabels[lineaOrigen]} → ${BusinessLineLabels[lineaNegocio]})`
        : '';
    const comentario = dto.comentario ? ` ${dto.comentario}` : '';

    await this.registrarActividad(
      client.id,
      ClientActivityType.CAMBIO_ETAPA,
      `Etapa: ${ClientStageLabels[etapaOrigen] ?? etapaOrigen} → ${ClientStageLabels[etapaDestino]}${cambioDeLinea}.${comentario}`,
      actor,
    );

    this.logger.log(
      `Cliente ${client.id}: ${etapaOrigen} -> ${etapaDestino} (${lineaNegocio})`,
    );

    return this.findOne(client.id);
  }

  /** Tablero kanban de una línea de negocio: columnas + clientes activos. */
  async findKanban(lineaNegocio: BusinessLine): Promise<KanbanBoardDto> {
    const clientes = await this.clientDAO.find({
      where: { lineaNegocio, estado: ClientStatus.ACTIVO },
      relations: ['responsable'],
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: KANBAN_MAX_CARDS,
    });

    return {
      lineaNegocio,
      lineaNegocioLabel: BusinessLineLabels[lineaNegocio],
      columnas: this.buildColumns(lineaNegocio),
      clientes: clientes.map((client) => this.stripSensitive(client)),
    };
  }

  /** Catálogo de etapas por línea de negocio (lo consume el selector del kanban). */
  getStageCatalog(): StageCatalogDto[] {
    return BusinessLineList.map((lineaNegocio) => ({
      lineaNegocio,
      label: BusinessLineLabels[lineaNegocio],
      color: BusinessLineColors[lineaNegocio],
      etapas: this.buildColumns(lineaNegocio),
    }));
  }

  // =========================================================================
  // Descarte y reactivacion
  // =========================================================================

  /** Descarta un cliente dejando registrado el motivo. */
  async discard(
    id: number,
    dto: DiscardClientDto,
    user?: ItJwtPayload,
  ): Promise<Client> {
    const client = await this.clientDAO.findOne({ where: { id } });

    if (!client) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    if (client.estado === ClientStatus.DESCARTADO) {
      throw new HttpException(
        {
          message: 'El cliente ya estaba descartado',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    client.estado = ClientStatus.DESCARTADO;
    client.motivoDescarte = dto.motivoDescarte;
    client.fechaDescarte = new Date();
    await this.clientDAO.save(client);

    const actor = await this.resolveActor(user);
    await this.registrarActividad(
      client.id,
      ClientActivityType.DESCARTE,
      `Cliente descartado. Motivo: ${dto.motivoDescarte}`,
      actor,
    );

    this.logger.log(`Cliente descartado: ${client.id}`);
    return this.findOne(client.id);
  }

  /** Devuelve a activo un cliente descartado y limpia el motivo. */
  async restore(id: number, user?: ItJwtPayload): Promise<Client> {
    const client = await this.clientDAO.findOne({ where: { id } });

    if (!client) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    if (client.estado === ClientStatus.ACTIVO) {
      throw new HttpException(
        {
          message: 'El cliente ya estaba activo',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const motivoAnterior = client.motivoDescarte;
    client.estado = ClientStatus.ACTIVO;
    client.motivoDescarte = null;
    client.fechaDescarte = null;
    await this.clientDAO.save(client);

    const actor = await this.resolveActor(user);
    await this.registrarActividad(
      client.id,
      ClientActivityType.REACTIVACION,
      `Cliente reactivado. Descarte anterior: ${motivoAnterior ?? 'sin motivo registrado'}`,
      actor,
    );

    this.logger.log(`Cliente reactivado: ${client.id}`);
    return this.findOne(client.id);
  }

  // =========================================================================
  // Historial
  // =========================================================================

  /** Historial paginado de un cliente, de lo más reciente a lo más antiguo. */
  async findActivities(
    clientId: number,
    dto: FindAllClientActivityDto,
  ): Promise<ItFindAllResponse<ClientActivity>> {
    await this.assertClientExists(clientId);

    const { page = 1, size = 20, tipo } = dto;
    const where: FindOptionsWhere<ClientActivity> = { clientId };
    if (tipo) where.tipo = tipo;

    const total = await this.clientActivityDAO.count({ where });
    const data = await this.clientActivityDAO.find({
      where,
      skip: (page - 1) * size,
      take: size,
      order: { fecha: 'DESC', id: 'DESC' },
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

  /** Añade un apunte manual al historial (llamada, visita, nota...). */
  async addActivity(
    clientId: number,
    dto: CreateClientActivityDto,
    user?: ItJwtPayload,
  ): Promise<ClientActivity> {
    await this.assertClientExists(clientId);

    const actor = await this.resolveActor(user);
    return this.registrarActividad(
      clientId,
      dto.tipo,
      dto.descripcion,
      actor,
      dto.fecha ? new Date(dto.fecha) : undefined,
    );
  }

  // =========================================================================
  // Importacion CSV / Excel
  // =========================================================================

  /**
   * Importa clientes desde un CSV o un libro de Excel.
   *
   * Nunca aborta a mitad: cada fila se procesa por separado y las que fallan
   * se devuelven en `errores` con su número de línea, para que la persona usuaria
   * pueda corregir el fichero y repetir solo esas.
   */
  async importFromFile(
    file: UploadedImportFile,
    dto: ImportClientsDto,
    user?: ItJwtPayload,
  ): Promise<ImportClientsSummaryDto> {
    if (!file || !file.buffer?.length) {
      throw new HttpException(
        {
          message: 'No se ha recibido ningún fichero para importar',
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const extension = getFileExtension(file.originalname);
    if (!SUPPORTED_IMPORT_EXTENSIONS.includes(extension)) {
      throw new HttpException(
        {
          message: `Formato no admitido. Usa un fichero ${SUPPORTED_IMPORT_EXTENSIONS.join(', ')}.`,
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    let filas: Record<string, unknown>[];
    try {
      filas = parseImportFile(file);
    } catch (error) {
      throw new HttpException(
        {
          message:
            error instanceof Error
              ? error.message
              : 'No se ha podido leer el fichero',
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const lineaPorDefecto = dto.lineaNegocio ?? BusinessLine.PSI;
    const tipoPorDefecto = dto.tipo ?? ClientType.INVERSOR;
    const actualizarExistentes = dto.actualizarExistentes === 'true';
    const actor = await this.resolveActor(user);

    const resumen: ImportClientsSummaryDto = {
      totalFilas: filas.length,
      creados: 0,
      actualizados: 0,
      omitidos: 0,
      errores: [],
    };

    for (let indice = 0; indice < filas.length; indice++) {
      // +2: la fila 1 son las cabeceras y el usuario cuenta desde 1.
      const numeroFila = indice + 2;

      try {
        const fila = mapRowToClientInput(filas[indice]);

        if (!fila.nombre) {
          resumen.omitidos++;
          resumen.errores.push({
            fila: numeroFila,
            motivo: 'Falta el nombre del cliente',
          });
          continue;
        }

        const lineaNegocio = fila.lineaNegocio ?? lineaPorDefecto;
        const etapa =
          normalizeStage(fila.etapa, lineaNegocio) ?? getFirstStage(lineaNegocio);

        const existente = fila.email
          ? await this.clientDAO.findOne({ where: { email: fila.email } })
          : null;

        if (existente && !actualizarExistentes) {
          resumen.omitidos++;
          resumen.errores.push({
            fila: numeroFila,
            motivo: `Ya existe un cliente con el correo ${fila.email}`,
          });
          continue;
        }

        if (existente) {
          this.aplicarFilaImportada(existente, fila, lineaNegocio, etapa);
          await this.clientDAO.save(existente);
          await this.registrarActividad(
            existente.id,
            ClientActivityType.IMPORTACION,
            `Ficha actualizada desde el fichero ${file.originalname} (fila ${numeroFila}).`,
            actor,
          );
          resumen.actualizados++;
          continue;
        }

        const nuevo = this.clientDAO.create({
          nombre: fila.nombre,
          apellidos: fila.apellidos ?? null,
          email: fila.email ?? null,
          telefono: fila.telefono ?? null,
          documento: fila.documento ?? null,
          tipo: fila.tipo ?? tipoPorDefecto,
          lineaNegocio,
          etapa,
          presupuestoMin: fila.presupuestoMin ?? null,
          presupuestoMax: fila.presupuestoMax ?? null,
          zonasInteres: fila.zonasInteres ?? [],
          tipoOperacion: fila.tipoOperacion ?? null,
          origen: fila.origen ?? `Importación ${file.originalname}`,
          notas: fila.notas ?? null,
          estado: ClientStatus.ACTIVO,
          responsableId: actor.id ?? null,
        });

        const guardado = await this.clientDAO.save(nuevo);
        await this.registrarActividad(
          guardado.id,
          ClientActivityType.IMPORTACION,
          `Cliente creado desde el fichero ${file.originalname} (fila ${numeroFila}).`,
          actor,
        );
        resumen.creados++;
      } catch (error) {
        resumen.omitidos++;
        resumen.errores.push({
          fila: numeroFila,
          motivo:
            error instanceof Error ? error.message : 'Error desconocido en la fila',
        });
      }
    }

    this.logger.log(
      `Importación ${file.originalname}: ${resumen.creados} creados, ${resumen.actualizados} actualizados, ${resumen.omitidos} omitidos`,
    );

    return resumen;
  }

  // =========================================================================
  // Contrato IClientActions (asistente de IA)
  // =========================================================================

  /** @inheritdoc */
  async createClient(
    data: ICreateClientInput,
  ): Promise<IAssistantActionResult<Client>> {
    try {
      if (!data?.nombre?.trim()) {
        return {
          ok: false,
          mensaje: 'Necesito al menos el nombre del cliente para darlo de alta.',
        };
      }

      const lineaNegocio =
        this.resolveBusinessLine(data.lineaNegocio) ?? BusinessLine.PSI;
      const etapa = normalizeStage(data.etapa, lineaNegocio);

      if (data.etapa && !etapa) {
        return {
          ok: false,
          mensaje: `No reconozco la etapa «${data.etapa}» dentro de ${BusinessLineLabels[lineaNegocio]}.`,
        };
      }

      // Las zonas llegan dictadas ("Serranova", "serranova", "Mar Alta"): se normalizan
      // al enum. Si la persona usuaria mencionó zonas y no se reconoce ninguna, se
      // avisa en vez de darla de alta perdiendo el dato en silencio.
      const zonasInteres = normalizeZones(data.zonasInteres);

      if (data.zonasInteres?.length && !zonasInteres.length) {
        return {
          ok: false,
          mensaje: `No reconozco ninguna de esas zonas. Las zonas disponibles son: ${InterestZoneList.map(
            (zona) => InterestZoneLabels[zona],
          ).join(', ')}.`,
        };
      }

      const client = await this.create({
        nombre: data.nombre.trim(),
        apellidos: data.apellidos,
        email: data.email,
        telefono: data.telefono,
        documento: data.documento,
        lineaNegocio,
        etapa: etapa ?? undefined,
        origen: data.origen,
        presupuestoMin: data.presupuestoMin,
        presupuestoMax: data.presupuestoMax,
        zonasInteres: zonasInteres.length ? zonasInteres : undefined,
        notas: data.notas,
      });

      return {
        ok: true,
        mensaje: `He dado de alta a ${client.nombre}${client.apellidos ? ` ${client.apellidos}` : ''} en ${BusinessLineLabels[client.lineaNegocio]}, etapa ${ClientStageLabels[client.etapa]}.`,
        data: client,
      };
    } catch (error) {
      return {
        ok: false,
        mensaje: this.mensajeDeError(error, 'No he podido dar de alta al cliente.'),
      };
    }
  }

  /** @inheritdoc */
  async moveClientStage(
    clientRef: EntityRef,
    etapa: string,
  ): Promise<IAssistantActionResult<Client>> {
    try {
      const resolucion = await this.resolveClientRef(clientRef);
      if (!resolucion.ok) return resolucion;

      const client = resolucion.data;
      const etapaDestino = normalizeStage(etapa, client.lineaNegocio);

      if (!etapaDestino) {
        const disponibles = getStagesByBusinessLine(client.lineaNegocio)
          .map((stage) => ClientStageLabels[stage])
          .join(', ');
        return {
          ok: false,
          mensaje: `No reconozco la etapa «${etapa}». En ${BusinessLineLabels[client.lineaNegocio]} las etapas son: ${disponibles}.`,
        };
      }

      const actualizado = await this.moveStage(client.id, { etapa: etapaDestino });

      return {
        ok: true,
        mensaje: `He movido a ${actualizado.nombre} a la etapa ${ClientStageLabels[etapaDestino]}.`,
        data: actualizado,
      };
    } catch (error) {
      return {
        ok: false,
        mensaje: this.mensajeDeError(error, 'No he podido cambiar la etapa.'),
      };
    }
  }

  /** @inheritdoc */
  async findClients(
    filtro: IFindClientsFilter,
  ): Promise<IAssistantActionResult<Client[]>> {
    try {
      const lineaNegocio = this.resolveBusinessLine(filtro?.lineaNegocio);
      const resultado = await this.findAll({
        page: filtro?.page ?? 1,
        size: filtro?.size ?? 10,
        search: filtro?.search,
        lineaNegocio: lineaNegocio ?? undefined,
        etapa: filtro?.etapa,
        responsableId: filtro?.responsableId,
      });

      if (!resultado.data.length) {
        return {
          ok: true,
          mensaje: 'No he encontrado ningún cliente con esos criterios.',
          data: [],
        };
      }

      return {
        ok: true,
        mensaje:
          resultado.metadata.records === 1
            ? 'He encontrado 1 cliente.'
            : `He encontrado ${resultado.metadata.records} clientes.`,
        data: resultado.data,
      };
    } catch (error) {
      return {
        ok: false,
        mensaje: this.mensajeDeError(error, 'No he podido buscar los clientes.'),
        data: [],
      };
    }
  }

  // =========================================================================
  // Utilidades internas
  // =========================================================================

  /** Construye las columnas del kanban de una línea de negocio. */
  private buildColumns(lineaNegocio: BusinessLine): KanbanColumnDto[] {
    return getStagesByBusinessLine(lineaNegocio).map((stage) => ({
      id: stage,
      label: ClientStageLabels[stage],
      color: ClientStageColors[stage],
    }));
  }

  /**
   * Normaliza una etapa y comprueba que pertenezca a la línea de negocio.
   *
   * @param raw Etapa en texto libre. Si viene vacía se usa la primera etapa.
   * @param obligatoria Si es `true`, una etapa vacía es un error.
   */
  private resolveStageOrFail(
    raw: string | undefined | null,
    lineaNegocio: BusinessLine,
    obligatoria = false,
  ): ClientStage {
    if (raw === undefined || raw === null || raw === '') {
      if (obligatoria) {
        throw new HttpException(
          { message: 'La etapa destino es obligatoria', flag: Flag.VALIDATION_ERROR },
          HttpStatus.BAD_REQUEST,
        );
      }
      return getFirstStage(lineaNegocio);
    }

    const stage = normalizeStage(raw, lineaNegocio);
    if (!stage) {
      const disponibles = getStagesByBusinessLine(lineaNegocio)
        .map((candidate) => ClientStageLabels[candidate])
        .join(', ');
      throw new HttpException(
        {
          message: `La etapa «${raw}» no existe en ${BusinessLineLabels[lineaNegocio]}. Etapas válidas: ${disponibles}.`,
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return stage;
  }

  /** El presupuesto mínimo nunca puede superar al máximo. */
  private assertBudgetRange(min?: number | null, max?: number | null): void {
    if (
      min !== undefined &&
      min !== null &&
      max !== undefined &&
      max !== null &&
      min > max
    ) {
      throw new HttpException(
        {
          message: 'El presupuesto mínimo no puede ser mayor que el máximo',
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Comprueba que el cliente existe; si no, lanza 404. */
  private async assertClientExists(id: number): Promise<void> {
    const existe = await this.clientDAO.exist({ where: { id } });
    if (!existe) {
      throw new HttpException(
        { message: 'Cliente no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /** Escribe un apunte en el historial del cliente. */
  private async registrarActividad(
    clientId: number,
    tipo: ClientActivityType,
    descripcion: string,
    actor: ActorInfo,
    fecha?: Date,
  ): Promise<ClientActivity> {
    const actividad = this.clientActivityDAO.create({
      clientId,
      tipo,
      descripcion,
      fecha: fecha ?? new Date(),
      autor: actor.nombre,
      autorId: actor.id ?? null,
    });

    return this.clientActivityDAO.save(actividad);
  }

  /**
   * Traduce el usuario del token a un nombre presentable para el historial.
   * Sin usuario (acciones del asistente) el autor es «Asistente IA».
   */
  private async resolveActor(user?: ItJwtPayload): Promise<ActorInfo> {
    if (!user?.id) return { nombre: 'Asistente IA' };

    const registro = await this.userDAO.findOne({
      where: { id: user.id },
      select: ['id', 'name', 'lastName', 'email'],
    });

    if (!registro) return { id: user.id, nombre: user.email ?? 'Usuario' };

    const nombre = [registro.name, registro.lastName]
      .filter((parte) => Boolean(parte))
      .join(' ')
      .trim();

    return { id: registro.id, nombre: nombre || registro.email };
  }

  /** Nunca se devuelve la contraseña del usuario responsable. */
  private stripSensitive(client: Client): Client {
    if (client.responsable) delete client.responsable.password;
    return client;
  }

  /** Lista en español los campos que cambian respecto a la ficha guardada. */
  private describirCambios(
    original: Client,
    cambios: Partial<Client>,
  ): string[] {
    const descripciones: string[] = [];

    for (const [clave, etiqueta] of Object.entries(FIELD_LABELS)) {
      const campo = clave as keyof Client;
      if (!(campo in cambios)) continue;

      const nuevo = cambios[campo];
      if (nuevo === undefined) continue;

      const anterior = original[campo];
      const iguales = Array.isArray(anterior)
        ? JSON.stringify(anterior) === JSON.stringify(nuevo)
        : anterior === nuevo ||
          (anterior === null && nuevo === null) ||
          String(anterior ?? '') === String(nuevo ?? '');

      if (!iguales) descripciones.push(etiqueta);
    }

    return descripciones;
  }

  /** Vuelca en la entidad los campos no vacíos de una fila importada. */
  private aplicarFilaImportada(
    client: Client,
    fila: ImportedClientRow,
    lineaNegocio: BusinessLine,
    etapa: ClientStage,
  ): void {
    if (fila.nombre) client.nombre = fila.nombre;
    if (fila.apellidos) client.apellidos = fila.apellidos;
    if (fila.telefono) client.telefono = fila.telefono;
    if (fila.documento) client.documento = fila.documento;
    if (fila.tipo) client.tipo = fila.tipo;
    if (fila.presupuestoMin !== undefined) {
      client.presupuestoMin = fila.presupuestoMin;
    }
    if (fila.presupuestoMax !== undefined) {
      client.presupuestoMax = fila.presupuestoMax;
    }
    if (fila.zonasInteres?.length) {
      client.zonasInteres = Array.from(
        new Set<InterestZone>([
          ...(client.zonasInteres ?? []),
          ...fila.zonasInteres,
        ]),
      );
    }
    if (fila.tipoOperacion) client.tipoOperacion = fila.tipoOperacion;
    if (fila.origen) client.origen = fila.origen;
    if (fila.notas) client.notas = fila.notas;

    client.lineaNegocio = lineaNegocio;
    client.etapa = etapa;
  }

  /** Traduce el texto de línea de negocio que dicta el asistente. */
  private resolveBusinessLine(
    raw: string | undefined | null,
  ): BusinessLine | null {
    if (!raw) return null;
    const clave = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
    return (
      BusinessLineList.find((linea) => linea === clave) ??
      (clave.includes('psi') || clave.includes('inversor')
        ? BusinessLine.PSI
        : clave.includes('alquiler') || clave.includes('empresa')
          ? BusinessLine.ALQUILER_EMPRESAS
          : clave.includes('reforma')
            ? BusinessLine.REFORMAS
            : null)
    );
  }

  /**
   * Resuelve la referencia flexible del asistente (id o texto) a un cliente
   * concreto. Si hay varias coincidencias pide concreción en lugar de elegir.
   */
  private async resolveClientRef(
    clientRef: EntityRef,
  ): Promise<
    { ok: true; mensaje: string; data: Client } | { ok: false; mensaje: string }
  > {
    if (clientRef === undefined || clientRef === null || clientRef === '') {
      return { ok: false, mensaje: '¿De qué cliente se trata?' };
    }

    const posibleId = Number(clientRef);
    if (Number.isInteger(posibleId) && posibleId > 0) {
      const porId = await this.clientDAO.findOne({ where: { id: posibleId } });
      if (porId) return { ok: true, mensaje: 'Cliente localizado.', data: porId };
    }

    const texto = String(clientRef).trim();
    const candidatos = await this.clientDAO.find({
      where: [
        { nombre: ILike(`%${texto}%`) },
        { apellidos: ILike(`%${texto}%`) },
        { email: ILike(`%${texto}%`) },
        { telefono: ILike(`%${texto}%`) },
      ],
      take: 6,
    });

    if (!candidatos.length) {
      return {
        ok: false,
        mensaje: `No encuentro ningún cliente que encaje con «${texto}».`,
      };
    }

    if (candidatos.length > 1) {
      const nombres = candidatos
        .map(
          (candidato) =>
            `${candidato.nombre}${candidato.apellidos ? ` ${candidato.apellidos}` : ''} (#${candidato.id})`,
        )
        .join(', ');
      return {
        ok: false,
        mensaje: `Hay varios clientes que encajan con «${texto}»: ${nombres}. ¿A cuál te refieres?`,
      };
    }

    return { ok: true, mensaje: 'Cliente localizado.', data: candidatos[0] };
  }

  /** Extrae un mensaje en español de cualquier error para el asistente. */
  private mensajeDeError(error: unknown, porDefecto: string): string {
    if (error instanceof HttpException) {
      const respuesta = error.getResponse();
      if (typeof respuesta === 'object' && respuesta !== null) {
        const mensaje = (respuesta as { message?: string }).message;
        if (mensaje) return mensaje;
      }
      if (typeof respuesta === 'string') return respuesta;
    }

    this.logger.error(
      `Error en acción del asistente: ${error instanceof Error ? error.message : String(error)}`,
    );
    return porDefecto;
  }
}
