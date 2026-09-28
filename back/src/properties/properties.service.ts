import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { existsSync, unlinkSync } from 'fs';
import { basename } from 'path';

import {
  IAssistantActionResult,
  ICreatePropertyInput,
  IFindPropertiesFilter,
  IPropertyActions,
} from '../common/contracts/assistant-actions';
import { Flag } from '../common/enums/flag.enum';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';

import { Property } from './entities/property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { FindAllPropertyDto } from './dto/find-all-property.dto';
import { MatchPropertiesDto } from './dto/match-properties.dto';
import {
  PropertyType,
  PropertyTypeColors,
  PropertyTypeLabels,
  PROPERTY_TYPES,
} from './enums/property-type.enum';
import {
  MATCHABLE_PROPERTY_STATUSES,
  PropertyStatus,
  PropertyStatusColors,
  PropertyStatusLabels,
  PROPERTY_STATUSES,
} from './enums/property-status.enum';
import {
  PropertyZone,
  PropertyZoneLabels,
  PropertyZoneProvinces,
  PROPERTY_ZONES,
} from './enums/property-zone.enum';
import {
  normalizeStatus,
  normalizeType,
  normalizeZone,
  slugify,
  toNumber,
  toTextList,
} from './helpers/normalize.helper';
import {
  ItInvestorProfile,
  ItPropertyMatchResponse,
  ItScoredProperty,
} from './interfaces/property-match.interface';
import {
  buildPhotoUrl,
  isSafePhotoFileName,
  PROPERTY_PHOTOS_URL_PREFIX,
  resolvePhotoPath,
} from './config/photo-upload.config';

/**
 * Pesos del algoritmo de coincidencias. Solo cuentan los criterios que el
 * cliente ha fijado: la puntuación es el porcentaje obtenido sobre esos pesos,
 * de modo que un inmueble nunca suma puntos por criterios que nadie ha pedido.
 */
const MATCH_WEIGHTS = {
  zona: 35,
  tipo: 25,
  precio: 25,
  habitaciones: 5,
  superficie: 5,
  rentabilidad: 5,
} as const;

/**
 * Margen que se tolera por encima del presupuesto máximo antes de descartar el
 * inmueble: hasta aquí es negociable; por encima, no se ofrece al cliente.
 */
const PRESUPUESTO_TOLERANCIA = 1.1;

/** Puntuación mínima para considerar que un inmueble encaja de verdad. */
const UMBRAL_COINCIDENCIA = 45;

/** Secuencia que lleva la cuenta de las referencias `INM-` ya emitidas. */
const REFERENCE_SEQUENCE = 'properties_referencia_seq';

/** Nombres posibles de las columnas del perfil inversor en la tabla `clients`. */
const CLIENT_PROFILE_KEYS = {
  presupuestoMax: [
    'presupuestomax',
    'presupuestomaximo',
    'presupuestohasta',
    'budgetmax',
    'presupuesto',
    'budget',
  ],
  presupuestoMin: ['presupuestomin', 'presupuestominimo', 'presupuestodesde', 'budgetmin'],
  zonas: ['zonas', 'zonasinteres', 'zonasdeinteres', 'zonasobjetivo', 'zona', 'zones'],
  tipos: ['tipos', 'tiposinmueble', 'tipoinmueble', 'tipopropiedad', 'tipologia', 'tipo'],
  habitacionesMin: ['habitacionesmin', 'habitaciones', 'dormitorios', 'dormitoriosmin'],
  superficieMin: ['superficiemin', 'superficieminima', 'superficie', 'metrosmin'],
  rentabilidadMin: [
    'rentabilidadmin',
    'rentabilidadminima',
    'rentabilidadobjetivo',
    'rentabilidad',
  ],
  nombre: ['nombrecompleto', 'razonsocial', 'nombre', 'name'],
  apellidos: ['apellidos', 'lastname'],
} as const;

const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

/**
 * Servicio del dominio Inmuebles: cartera, fotos y cruce de coincidencias con
 * el perfil inversor del cliente. Implementa `IPropertyActions` para que el
 * asistente de IA pueda buscar y dar de alta inmuebles por voz.
 */
@Injectable()
export class PropertiesService implements IPropertyActions {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyDAO: Repository<Property>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async create(createPropertyDto: CreatePropertyDto): Promise<Property> {
    const referencia = createPropertyDto.referencia?.trim()
      ? createPropertyDto.referencia.trim()
      : await this.generateReference();

    const duplicated = await this.propertyDAO.findOne({ where: { referencia } });
    if (duplicated) {
      throw new HttpException(
        { message: 'Ya existe un inmueble con esa referencia', flag: Flag.CONFLICT },
        HttpStatus.CONFLICT,
      );
    }

    const property = this.propertyDAO.create({
      ...createPropertyDto,
      referencia,
      poblacion: createPropertyDto.poblacion || PropertyZoneLabels[createPropertyDto.zona],
      provincia: createPropertyDto.provincia || PropertyZoneProvinces[createPropertyDto.zona],
      estado: createPropertyDto.estado || PropertyStatus.DISPONIBLE,
      superficie: createPropertyDto.superficie ?? 0,
      habitaciones: createPropertyDto.habitaciones ?? 0,
      caracteristicas: createPropertyDto.caracteristicas ?? [],
      fotos: this.sanitizePhotoUrls(createPropertyDto.fotos),
    });

    const saved = await this.propertyDAO.save(property);
    this.logger.log(`Inmueble creado: ${saved.referencia} — ${saved.titulo}`);
    return saved;
  }

  async findAll(dto: FindAllPropertyDto): Promise<ItFindAllResponse<Property>> {
    const {
      page = 1,
      size = 10,
      search,
      zona,
      estado,
      tipo,
      precioMin,
      precioMax,
      habitacionesMin,
      clientId,
    } = dto;

    const query = this.propertyDAO.createQueryBuilder('property');

    if (search) {
      query.andWhere(
        '(property.referencia ILIKE :search OR property.titulo ILIKE :search' +
          ' OR property.direccion ILIKE :search OR property.poblacion ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (zona) query.andWhere('property.zona = :zona', { zona });
    if (estado) query.andWhere('property.estado = :estado', { estado });
    if (tipo) query.andWhere('property.tipo = :tipo', { tipo });
    if (precioMin !== undefined) query.andWhere('property.precio >= :precioMin', { precioMin });
    if (precioMax !== undefined) query.andWhere('property.precio <= :precioMax', { precioMax });
    if (habitacionesMin !== undefined) {
      query.andWhere('property.habitaciones >= :habitacionesMin', { habitacionesMin });
    }
    if (clientId !== undefined) query.andWhere('property.clientId = :clientId', { clientId });

    query
      .orderBy('property.createdAt', 'DESC')
      .addOrderBy('property.id', 'DESC')
      .skip((page - 1) * size)
      .take(size);

    const [data, total] = await query.getManyAndCount();

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

  async findOne(id: number): Promise<Property> {
    const property = await this.propertyDAO.findOne({ where: { id } });

    if (!property) {
      throw new HttpException(
        { message: 'Inmueble no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return property;
  }

  async update(id: number, updatePropertyDto: UpdatePropertyDto): Promise<Property> {
    const property = await this.findOne(id);

    if (updatePropertyDto.referencia && updatePropertyDto.referencia !== property.referencia) {
      const duplicated = await this.propertyDAO.findOne({
        where: { referencia: updatePropertyDto.referencia },
      });
      if (duplicated) {
        throw new HttpException(
          { message: 'Ya existe un inmueble con esa referencia', flag: Flag.CONFLICT },
          HttpStatus.CONFLICT,
        );
      }
    }

    const fotos =
      updatePropertyDto.fotos !== undefined
        ? this.sanitizePhotoUrls(updatePropertyDto.fotos)
        : property.fotos;

    Object.assign(property, updatePropertyDto, { fotos });

    const updated = await this.propertyDAO.save(property);
    this.logger.log(`Inmueble actualizado: ${updated.referencia}`);
    return updated;
  }

  async remove(id: number): Promise<void> {
    const property = await this.findOne(id);
    (property.fotos ?? []).forEach((url) => this.deletePhotoFile(url));
    await this.propertyDAO.remove(property);
    this.logger.log(`Inmueble eliminado: ${property.referencia}`);
  }

  // -------------------------------------------------------------------------
  // Fotos
  // -------------------------------------------------------------------------

  /** Registra los ficheros ya volcados a disco y devuelve sus URLs relativas. */
  storePhotos(files: Express.Multer.File[]): string[] {
    if (!files?.length) {
      throw new HttpException(
        { message: 'No se ha recibido ninguna foto', flag: Flag.VALIDATION_ERROR },
        HttpStatus.BAD_REQUEST,
      );
    }
    return files.map((file) => buildPhotoUrl(file.filename));
  }

  /** Sube fotos y las añade a la galería del inmueble. */
  async addPhotos(id: number, files: Express.Multer.File[]): Promise<Property> {
    const property = await this.findOne(id);
    const nuevas = this.storePhotos(files);

    property.fotos = [...(property.fotos ?? []), ...nuevas];
    const updated = await this.propertyDAO.save(property);
    this.logger.log(`${nuevas.length} foto(s) añadidas al inmueble ${updated.referencia}`);
    return updated;
  }

  /** Quita una foto de la galería y borra el fichero del disco. */
  async removePhoto(id: number, fileName: string): Promise<Property> {
    const property = await this.findOne(id);

    if (!isSafePhotoFileName(fileName)) {
      throw new HttpException(
        { message: 'Nombre de fichero no válido', flag: Flag.VALIDATION_ERROR },
        HttpStatus.BAD_REQUEST,
      );
    }

    const url = buildPhotoUrl(fileName);
    if (!(property.fotos ?? []).includes(url)) {
      throw new HttpException(
        { message: 'La foto no pertenece a este inmueble', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    property.fotos = property.fotos.filter((foto) => foto !== url);
    const updated = await this.propertyDAO.save(property);
    this.deletePhotoFile(url);
    this.logger.log(`Foto eliminada del inmueble ${updated.referencia}: ${fileName}`);
    return updated;
  }

  /**
   * Borra del disco una foto que todavía no está vinculada a ningún inmueble
   * (subida desde el formulario de alta y descartada antes de guardar). Si la
   * foto pertenece a una ficha hay que quitarla desde ella, no por aquí.
   */
  async removeUnlinkedPhoto(fileName: string): Promise<void> {
    if (!isSafePhotoFileName(fileName)) {
      throw new HttpException(
        { message: 'Nombre de fichero no válido', flag: Flag.VALIDATION_ERROR },
        HttpStatus.BAD_REQUEST,
      );
    }

    // `fotos` es una columna `simple-array`: se busca el nombre del fichero
    // dentro del texto, que es único por llevar marca de tiempo y aleatorio.
    const enUso = await this.propertyDAO
      .createQueryBuilder('property')
      .where('property.fotos LIKE :patron', { patron: `%${fileName}%` })
      .getCount();

    if (enUso > 0) {
      throw new HttpException(
        {
          message: 'La foto pertenece a un inmueble: quítala desde su ficha',
          flag: Flag.CONFLICT,
        },
        HttpStatus.CONFLICT,
      );
    }

    this.deletePhotoFile(buildPhotoUrl(fileName));
    this.logger.log(`Foto suelta eliminada: ${fileName}`);
  }

  /** Ruta física de una foto, validando el nombre para evitar salir de la carpeta. */
  resolvePhoto(fileName: string): string {
    if (!isSafePhotoFileName(fileName)) {
      throw new HttpException(
        { message: 'Nombre de fichero no válido', flag: Flag.VALIDATION_ERROR },
        HttpStatus.BAD_REQUEST,
      );
    }

    const path = resolvePhotoPath(fileName);
    if (!existsSync(path)) {
      throw new HttpException(
        { message: 'Foto no encontrada', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return path;
  }

  // -------------------------------------------------------------------------
  // Catálogos
  // -------------------------------------------------------------------------

  /** Zonas, tipos y estados con etiqueta y color, para alimentar la interfaz. */
  getCatalogs() {
    return {
      zonas: PROPERTY_ZONES.map((value) => ({
        value,
        label: PropertyZoneLabels[value],
        provincia: PropertyZoneProvinces[value],
      })),
      tipos: PROPERTY_TYPES.map((value) => ({
        value,
        label: PropertyTypeLabels[value],
        color: PropertyTypeColors[value],
      })),
      estados: PROPERTY_STATUSES.map((value) => ({
        value,
        label: PropertyStatusLabels[value],
        color: PropertyStatusColors[value],
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Coincidencias con el perfil inversor
  // -------------------------------------------------------------------------

  /**
   * Cruza el perfil inversor de un cliente (presupuesto, zonas y tipo) contra
   * la cartera y devuelve las coincidencias ordenadas por puntuación.
   */
  async matchForClient(
    clientId: number,
    dto: MatchPropertiesDto,
  ): Promise<ItPropertyMatchResponse> {
    const { perfil, cliente } = await this.resolveInvestorProfile(clientId, dto);

    const estados = dto.incluirNoDisponibles ? PROPERTY_STATUSES : MATCHABLE_PROPERTY_STATUSES;
    const candidatas = await this.propertyDAO
      .createQueryBuilder('property')
      .where('property.estado IN (:...estados)', { estados })
      .orderBy('property.precio', 'ASC')
      .getMany();

    const limite = dto.limite ?? 12;
    const sinCriterios = perfil.origen === 'vacio';
    const puntuadas = candidatas.map((property) => this.scoreProperty(property, perfil));

    // Sin criterios no hay encaje que medir: se enseña la cartera tal cual. Con
    // criterios, lo que incumple un criterio duro o no llega al umbral se aparta
    // en vez de colarse en la lista como si encajara.
    const aptas = sinCriterios
      ? puntuadas
      : puntuadas.filter((match) => !match.descartado && match.score >= UMBRAL_COINCIDENCIA);

    const coincidencias = aptas
      .sort((a, b) => b.score - a.score || a.property.precio - b.property.precio)
      .slice(0, limite)
      // `descartado` es interno del baremo: fuera no aporta y confunde.
      .map((match) => {
        const { descartado, ...publico } = match;
        void descartado;
        return publico;
      });

    return {
      clientId,
      cliente,
      perfil,
      coincidencias,
      evaluadas: candidatas.length,
      descartadas: puntuadas.length - aptas.length,
      sinCriterios,
    };
  }

  /**
   * Puntúa un inmueble frente al perfil inversor y redacta en español tanto los
   * motivos como los «peros». La puntuación es el porcentaje del peso obtenido
   * sobre el peso de los criterios que el cliente ha fijado: si no ha fijado
   * ninguno, no hay nada que puntuar y la puntuación es 0.
   */
  private scoreProperty(property: Property, perfil: ItInvestorProfile): ItScoredProperty {
    const motivos: string[] = [];
    const advertencias: string[] = [];
    let obtenido = 0;
    let posible = 0;
    let descartado = false;

    // Zona
    if (perfil.zonas.length) {
      posible += MATCH_WEIGHTS.zona;
      if (perfil.zonas.includes(property.zona)) {
        obtenido += MATCH_WEIGHTS.zona;
        motivos.push(`Está en ${PropertyZoneLabels[property.zona]}, una de sus zonas de interés`);
      } else {
        advertencias.push(
          `Está en ${PropertyZoneLabels[property.zona]}, fuera de las zonas que busca`,
        );
      }
    }

    // Tipo
    if (perfil.tipos.length) {
      posible += MATCH_WEIGHTS.tipo;
      if (perfil.tipos.includes(property.tipo)) {
        obtenido += MATCH_WEIGHTS.tipo;
        motivos.push(`Es un ${PropertyTypeLabels[property.tipo].toLowerCase()}, el tipo que busca`);
      } else {
        const buscados = perfil.tipos
          .map((tipo) => PropertyTypeLabels[tipo].toLowerCase())
          .join(' o ');
        advertencias.push(
          `Es un ${PropertyTypeLabels[property.tipo].toLowerCase()} y busca ${buscados}`,
        );
      }
    }

    // Precio frente al presupuesto
    const precio = property.precio ?? 0;
    const { presupuestoMin, presupuestoMax } = perfil;
    if (presupuestoMax !== undefined || presupuestoMin !== undefined) {
      posible += MATCH_WEIGHTS.precio;
      const superaMinimo = presupuestoMin === undefined || precio >= presupuestoMin;
      const dentroMaximo = presupuestoMax === undefined || precio <= presupuestoMax;

      if (superaMinimo && dentroMaximo) {
        obtenido += MATCH_WEIGHTS.precio;
        motivos.push(`Precio de ${currency.format(precio)}, dentro de su presupuesto`);
      } else if (!dentroMaximo && presupuestoMax !== undefined) {
        const exceso = Math.round((precio / presupuestoMax - 1) * 100);
        if (precio <= presupuestoMax * PRESUPUESTO_TOLERANCIA) {
          obtenido += MATCH_WEIGHTS.precio * 0.5;
          advertencias.push(
            `Cuesta ${currency.format(precio)}, un ${exceso} % por encima de su presupuesto: hay margen de negociación`,
          );
        } else {
          descartado = true;
          advertencias.push(
            `Cuesta ${currency.format(precio)}, un ${exceso} % por encima de su presupuesto máximo de ${currency.format(presupuestoMax)}`,
          );
        }
      } else if (presupuestoMin !== undefined) {
        obtenido += MATCH_WEIGHTS.precio * 0.5;
        advertencias.push(
          `Cuesta ${currency.format(precio)}, por debajo de los ${currency.format(presupuestoMin)} que quiere invertir`,
        );
      }
    }

    // Habitaciones
    if (perfil.habitacionesMin !== undefined) {
      posible += MATCH_WEIGHTS.habitaciones;
      if ((property.habitaciones ?? 0) >= perfil.habitacionesMin) {
        obtenido += MATCH_WEIGHTS.habitaciones;
        motivos.push(
          `${property.habitaciones} habitaciones (pide al menos ${perfil.habitacionesMin})`,
        );
      } else {
        advertencias.push(
          `Tiene ${property.habitaciones ?? 0} habitaciones y pide al menos ${perfil.habitacionesMin}`,
        );
      }
    }

    // Superficie
    if (perfil.superficieMin !== undefined) {
      posible += MATCH_WEIGHTS.superficie;
      if ((property.superficie ?? 0) >= perfil.superficieMin) {
        obtenido += MATCH_WEIGHTS.superficie;
        motivos.push(`${property.superficie} m² (pide al menos ${perfil.superficieMin} m²)`);
      } else {
        advertencias.push(
          `Tiene ${property.superficie ?? 0} m² y pide al menos ${perfil.superficieMin} m²`,
        );
      }
    }

    // Rentabilidad estimada
    const rentabilidad = property.rentabilidadEstimada;
    if (perfil.rentabilidadMin !== undefined) {
      posible += MATCH_WEIGHTS.rentabilidad;
      if (rentabilidad === null || rentabilidad === undefined) {
        advertencias.push(
          `Sin rentabilidad estimada: no se puede comprobar el ${decimal.format(perfil.rentabilidadMin)} % que exige`,
        );
      } else if (rentabilidad >= perfil.rentabilidadMin) {
        obtenido += MATCH_WEIGHTS.rentabilidad;
        motivos.push(
          `Rentabilidad del ${decimal.format(rentabilidad)} %, por encima del ${decimal.format(perfil.rentabilidadMin)} % que exige`,
        );
      } else {
        advertencias.push(
          `Rentabilidad del ${decimal.format(rentabilidad)} %, por debajo del ${decimal.format(perfil.rentabilidadMin)} % que exige`,
        );
      }
    } else if (rentabilidad !== null && rentabilidad !== undefined) {
      // Dato informativo: el cliente no ha exigido rentabilidad, así que suma
      // como argumento de venta pero no puntúa.
      motivos.push(`Rentabilidad estimada del ${decimal.format(rentabilidad)} %`);
    }

    if (!motivos.length) motivos.push('Disponible en cartera');

    return {
      property,
      score: posible > 0 ? Math.max(0, Math.min(100, Math.round((obtenido / posible) * 100))) : 0,
      motivos,
      advertencias,
      descartado,
    };
  }

  /**
   * Compone el perfil inversor a partir de la ficha del cliente y de los
   * ajustes recibidos. La lectura de `clients` se hace por SQL directo y de
   * forma tolerante: ese esquema pertenece al dominio `clients/`, así que si la
   * tabla o las columnas aún no existen se sigue adelante con los parámetros.
   */
  private async resolveInvestorProfile(
    clientId: number,
    dto: MatchPropertiesDto,
  ): Promise<{ perfil: ItInvestorProfile; cliente?: string }> {
    const { tablaDisponible, row } = await this.readClientRow(clientId);

    // Si la tabla existe pero no hay ficha, el cliente no existe: no tiene
    // sentido devolver «toda la cartera» como si el perfil estuviera vacío.
    if (tablaDisponible && !row) {
      throw new HttpException(
        {
          message: `No existe ningún cliente con el identificador ${clientId}`,
          flag: Flag.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const campos = this.indexRowByNormalizedKey(row);

    const desdeCliente: Partial<ItInvestorProfile> = {
      presupuestoMax: toNumber(this.pick(campos, CLIENT_PROFILE_KEYS.presupuestoMax)),
      presupuestoMin: toNumber(this.pick(campos, CLIENT_PROFILE_KEYS.presupuestoMin)),
      zonas: toTextList(this.pick(campos, CLIENT_PROFILE_KEYS.zonas))
        .map(normalizeZone)
        .filter((zona): zona is PropertyZone => Boolean(zona)),
      tipos: toTextList(this.pick(campos, CLIENT_PROFILE_KEYS.tipos))
        .map(normalizeType)
        .filter((tipo): tipo is PropertyType => Boolean(tipo)),
      habitacionesMin: toNumber(this.pick(campos, CLIENT_PROFILE_KEYS.habitacionesMin)),
      superficieMin: toNumber(this.pick(campos, CLIENT_PROFILE_KEYS.superficieMin)),
      rentabilidadMin: toNumber(this.pick(campos, CLIENT_PROFILE_KEYS.rentabilidadMin)),
    };

    const usaCliente = Boolean(
      row &&
        (desdeCliente.presupuestoMax !== undefined ||
          desdeCliente.presupuestoMin !== undefined ||
          desdeCliente.zonas?.length ||
          desdeCliente.tipos?.length ||
          desdeCliente.habitacionesMin !== undefined ||
          desdeCliente.superficieMin !== undefined ||
          desdeCliente.rentabilidadMin !== undefined),
    );

    const usaParametros = Boolean(
      dto.presupuestoMax !== undefined ||
        dto.presupuestoMin !== undefined ||
        dto.zonas?.length ||
        dto.tipos?.length ||
        dto.habitacionesMin !== undefined ||
        dto.superficieMin !== undefined ||
        dto.rentabilidadMin !== undefined,
    );

    const perfil: ItInvestorProfile = {
      presupuestoMax: dto.presupuestoMax ?? desdeCliente.presupuestoMax,
      presupuestoMin: dto.presupuestoMin ?? desdeCliente.presupuestoMin,
      zonas: dto.zonas?.length ? dto.zonas : (desdeCliente.zonas ?? []),
      tipos: dto.tipos?.length ? dto.tipos : (desdeCliente.tipos ?? []),
      habitacionesMin: dto.habitacionesMin ?? desdeCliente.habitacionesMin,
      superficieMin: dto.superficieMin ?? desdeCliente.superficieMin,
      rentabilidadMin: dto.rentabilidadMin ?? desdeCliente.rentabilidadMin,
      origen:
        usaCliente && usaParametros
          ? 'mixto'
          : usaCliente
            ? 'cliente'
            : usaParametros
              ? 'parametros'
              : 'vacio',
    };

    const nombre = [
      this.pick(campos, CLIENT_PROFILE_KEYS.nombre),
      this.pick(campos, CLIENT_PROFILE_KEYS.apellidos),
    ]
      .filter((parte) => typeof parte === 'string' && parte.trim().length > 0)
      .join(' ')
      .trim();

    return { perfil, cliente: nombre || undefined };
  }

  /**
   * Lee la fila del cliente. `tablaDisponible` distingue «el cliente no existe»
   * de «el dominio `clients/` todavía no ha creado su tabla»: en el primer caso
   * hay que avisar, en el segundo se sigue adelante con los parámetros.
   */
  private async readClientRow(
    clientId: number,
  ): Promise<{ tablaDisponible: boolean; row: Record<string, unknown> | null }> {
    try {
      const rows: Record<string, unknown>[] = await this.dataSource.query(
        'SELECT * FROM clients WHERE id = $1 LIMIT 1',
        [clientId],
      );
      return { tablaDisponible: true, row: rows?.[0] ?? null };
    } catch (error) {
      this.logger.warn(
        `No se ha podido leer el perfil del cliente ${clientId}: ${(error as Error).message}`,
      );
      return { tablaDisponible: false, row: null };
    }
  }

  /** Indexa las columnas de la fila por su nombre normalizado (sin tildes ni guiones). */
  private indexRowByNormalizedKey(
    row: Record<string, unknown> | null,
  ): Record<string, unknown> {
    if (!row) return {};
    return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[slugify(key)] = value;
      return acc;
    }, {});
  }

  /** Primer valor no vacío entre los nombres de columna candidatos. */
  private pick(campos: Record<string, unknown>, keys: readonly string[]): unknown {
    for (const key of keys) {
      const value = campos[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }

  // -------------------------------------------------------------------------
  // Acciones del asistente de IA (contrato `IPropertyActions`)
  // -------------------------------------------------------------------------

  /** @inheritdoc */
  async findProperties(
    filtro: IFindPropertiesFilter,
  ): Promise<IAssistantActionResult<unknown[]>> {
    try {
      const zona = normalizeZone(filtro?.poblacion);
      const dto: FindAllPropertyDto = {
        page: filtro?.page ?? 1,
        size: filtro?.size ?? 10,
        search: filtro?.search,
        zona,
        tipo: normalizeType(filtro?.tipo),
        estado: normalizeStatus(filtro?.estado),
        precioMin: filtro?.precioMin,
        precioMax: filtro?.precioMax,
        habitacionesMin: filtro?.habitacionesMin,
      };

      // Si la población dictada no es una de las siete zonas, se busca como texto.
      if (filtro?.poblacion && !zona) {
        dto.search = [dto.search, filtro.poblacion].filter(Boolean).join(' ');
      }

      const { data, metadata } = await this.findAll(dto);

      if (!data.length) {
        return {
          ok: true,
          mensaje: 'No hay inmuebles en la cartera que cumplan esos criterios.',
          data: [],
        };
      }

      return {
        ok: true,
        mensaje:
          metadata.records === 1
            ? 'He encontrado 1 inmueble en la cartera.'
            : `He encontrado ${metadata.records} inmuebles en la cartera.`,
        data,
      };
    } catch (error) {
      this.logger.error('Error buscando inmuebles para el asistente', error as Error);
      return {
        ok: false,
        mensaje: 'No he podido consultar la cartera de inmuebles en este momento.',
        data: [],
      };
    }
  }

  /** @inheritdoc */
  async createProperty(
    data: ICreatePropertyInput,
  ): Promise<IAssistantActionResult<unknown>> {
    if (!data?.direccion?.trim()) {
      return {
        ok: false,
        mensaje: 'Necesito al menos la dirección del inmueble para darlo de alta.',
      };
    }

    const zona = normalizeZone(data.poblacion) ?? normalizeZone(data.direccion);
    if (!zona) {
      return {
        ok: false,
        mensaje:
          'No he identificado la zona. Indícame una de las siete: ' +
          `${PROPERTY_ZONES.map((value) => PropertyZoneLabels[value]).join(', ')}.`,
      };
    }

    if (data.referencia?.trim()) {
      const duplicada = await this.propertyDAO.findOne({
        where: { referencia: data.referencia.trim() },
      });
      if (duplicada) {
        return {
          ok: false,
          mensaje: `Ya existe un inmueble con la referencia ${data.referencia.trim()}.`,
        };
      }
    }

    try {
      const property = await this.create({
        referencia: data.referencia?.trim(),
        titulo: `${PropertyTypeLabels[normalizeType(data.tipo) ?? PropertyType.PISO]} en ${PropertyZoneLabels[zona]}`,
        tipo: normalizeType(data.tipo) ?? PropertyType.PISO,
        direccion: data.direccion.trim(),
        zona,
        poblacion: data.poblacion?.trim(),
        provincia: data.provincia?.trim(),
        codigoPostal: data.codigoPostal?.trim(),
        precio: data.precio ?? 0,
        superficie: data.superficie,
        habitaciones: data.habitaciones,
        estado: normalizeStatus(data.estado) ?? PropertyStatus.DISPONIBLE,
        notas: data.notas?.trim(),
        clientId: typeof data.clientRef === 'number' ? data.clientRef : undefined,
      });

      return {
        ok: true,
        mensaje: `Inmueble ${property.referencia} dado de alta en ${PropertyZoneLabels[zona]}.`,
        data: property,
      };
    } catch (error) {
      this.logger.error('Error dando de alta un inmueble desde el asistente', error as Error);
      return {
        ok: false,
        mensaje: 'No he podido dar de alta el inmueble. Revisa los datos e inténtalo de nuevo.',
      };
    }
  }

  // -------------------------------------------------------------------------
  // Utilidades internas
  // -------------------------------------------------------------------------

  /**
   * Genera la siguiente referencia libre con el patrón `INM-0001`.
   *
   * El contador vive en una secuencia de la base de datos, no en el número de
   * inmuebles ni en el máximo de los que quedan: si se da de baja INM-0011, ese
   * número queda quemado para siempre. De lo contrario un contrato o una
   * factura que cite «INM-0011» acabaría apuntando a otro inmueble.
   */
  private async generateReference(): Promise<string> {
    const maximoEmitido = await this.highestReferenceNumber();
    let siguiente = maximoEmitido + 1;

    try {
      siguiente = await this.nextReferenceFromSequence(maximoEmitido);
    } catch (error) {
      this.logger.warn(
        `No se ha podido usar la secuencia de referencias: ${(error as Error).message}`,
      );
    }

    for (let intento = 0; intento < 50; intento += 1) {
      const candidata = `INM-${String(siguiente + intento).padStart(4, '0')}`;
      const existe = await this.propertyDAO.findOne({ where: { referencia: candidata } });
      if (!existe) return candidata;
    }

    return `INM-${Date.now()}`;
  }

  /** Número más alto entre las referencias `INM-` que siguen en la cartera. */
  private async highestReferenceNumber(): Promise<number> {
    const emitidas = await this.propertyDAO
      .createQueryBuilder('property')
      .select('property.referencia', 'referencia')
      .where('property.referencia LIKE :patron', { patron: 'INM-%' })
      .getRawMany<{ referencia: string }>();

    return emitidas.reduce((mayor, { referencia }) => {
      const numero = Number(referencia.slice('INM-'.length));
      return Number.isInteger(numero) && numero > mayor ? numero : mayor;
    }, 0);
  }

  /**
   * Reserva el siguiente número en la secuencia, creándola si hace falta y
   * adelantándola hasta lo que ya haya en la cartera (primer arranque o carga
   * de datos de demostración). PostgreSQL, como el resto del proyecto.
   */
  private async nextReferenceFromSequence(maximoEnCartera: number): Promise<number> {
    await this.dataSource.query(`CREATE SEQUENCE IF NOT EXISTS ${REFERENCE_SEQUENCE} AS bigint`);

    const [estado] = await this.dataSource.query<{ last_value: string; is_called: boolean }[]>(
      `SELECT last_value, is_called FROM ${REFERENCE_SEQUENCE}`,
    );
    const yaEmitido = estado?.is_called ? Number(estado.last_value) : 0;

    if (maximoEnCartera > yaEmitido) {
      await this.dataSource.query(`SELECT setval('${REFERENCE_SEQUENCE}', $1, true)`, [
        maximoEnCartera,
      ]);
    }

    const [fila] = await this.dataSource.query<{ nextval: string }[]>(
      `SELECT nextval('${REFERENCE_SEQUENCE}') AS nextval`,
    );
    return Number(fila.nextval);
  }

  /** Deja solo las URLs de fotos que pertenecen a la carpeta del dominio. */
  private sanitizePhotoUrls(fotos?: string[]): string[] {
    return (fotos ?? [])
      .map((foto) => foto?.trim())
      .filter((foto): foto is string => Boolean(foto))
      .filter((foto) => foto.startsWith(`${PROPERTY_PHOTOS_URL_PREFIX}/`))
      .filter((foto) => isSafePhotoFileName(basename(foto)));
  }

  /** Borra del disco el fichero asociado a una URL de foto. */
  private deletePhotoFile(url: string): void {
    const fileName = basename(url);
    if (!isSafePhotoFileName(fileName)) return;

    const path = resolvePhotoPath(fileName);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch (error) {
      this.logger.warn(`No se ha podido borrar la foto ${fileName}: ${(error as Error).message}`);
    }
  }
}
