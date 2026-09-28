import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
  IsNull,
  In,
} from 'typeorm';
import { createReadStream, existsSync, unlinkSync, writeFileSync } from 'fs';
import type { ReadStream } from 'fs';
import { Folder } from './entities/folder.entity';
import { FileDoc } from './entities/file-doc.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FindAllFolderDto } from './dto/find-all-folder.dto';
import { CreateFileDocDto } from './dto/create-file-doc.dto';
import { UpdateFileDocDto } from './dto/update-file-doc.dto';
import { FindAllFileDocDto } from './dto/find-all-file-doc.dto';
import { EnsureRootFolderDto } from './dto/ensure-root-folder.dto';
import { MoveBulkFileDocDto } from './dto/move-file-doc.dto';
import {
  ItFolderNode,
  ItFolderBreadcrumb,
} from './interfaces/it-folder-tree.interface';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { Flag } from '../common/enums/flag.enum';
import {
  getExtension,
  getMimePorExtension,
  sanearNombre,
} from './helpers/document-type.helper';
import { columnaSinTildes, quitarTildes } from './helpers/search.helper';
import {
  SUBCARPETA_DOCS,
  ensureDocsDir,
  generarNombreAlmacenado,
  toAbsolutePath,
} from './helpers/storage.helper';

/**
 * Drive propio de CRMIA: arbol de carpetas y ficheros en disco.
 *
 * Los borrados son logicos (`deletedAt`): en un CRM inmobiliario perder una
 * nota simple o un plano por un clic es inaceptable, asi que el binario nunca
 * se elimina del disco al borrar; solo desaparece del arbol.
 */
@Injectable()
export class DocumentsService implements OnModuleInit {
  private readonly logger = new Logger(DocumentsService.name);

  /**
   * `true` si la base de datos tiene disponible la extension `unaccent`.
   * Decide como se normaliza la columna al buscar (ver `search.helper.ts`).
   */
  private unaccentDisponible = false;

  constructor(
    @InjectRepository(Folder)
    private readonly folderDAO: Repository<Folder>,
    @InjectRepository(FileDoc)
    private readonly fileDocDAO: Repository<FileDoc>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    ensureDocsDir();
  }

  /**
   * Activa `unaccent` en el arranque para que el buscador ignore las tildes.
   *
   * La extension viene con la imagen oficial de Postgres, pero crearla exige
   * privilegios que no todos los despliegues dan: si falla, la busqueda sigue
   * funcionando con el respaldo `translate` y solo queda constancia en el log.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS unaccent');
      this.unaccentDisponible = true;
    } catch (error) {
      this.unaccentDisponible = false;
      this.logger.warn(
        `No se ha podido activar la extensión «unaccent»; la búsqueda sin tildes usará translate(): ${
          (error as Error)?.message ?? error
        }`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Carpetas
  // -------------------------------------------------------------------------

  async createFolder(
    dto: CreateFolderDto,
    createdById?: number,
  ): Promise<Folder> {
    const nombre = sanearNombre(dto.nombre);
    if (!nombre) {
      throw new HttpException(
        { message: 'El nombre de la carpeta no es válido', flag: Flag.VALIDATION_ERROR },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.parentId) {
      await this.findOneFolder(dto.parentId);
    }

    await this.asegurarNombreLibre(nombre, dto.parentId ?? null);

    const folder = this.folderDAO.create({
      nombre,
      parentId: dto.parentId ?? null,
      clienteId: dto.clienteId ?? null,
      propiedadId: dto.propiedadId ?? null,
      createdById: createdById ?? null,
      esRaiz: false,
    });

    const guardada = await this.folderDAO.save(folder);
    this.logger.log(`Carpeta creada: ${guardada.nombre} (id ${guardada.id})`);

    return guardada;
  }

  async findAllFolders(dto: FindAllFolderDto): Promise<ItFindAllResponse<Folder>> {
    const { page = 1, size = 10, parentId, clienteId, propiedadId, nombre } = dto;

    const consulta = this.folderDAO.createQueryBuilder('carpeta');

    if (parentId) consulta.andWhere('carpeta.parentId = :parentId', { parentId });
    if (clienteId) consulta.andWhere('carpeta.clienteId = :clienteId', { clienteId });
    if (propiedadId) {
      consulta.andWhere('carpeta.propiedadId = :propiedadId', { propiedadId });
    }
    if (nombre) this.filtrarPorNombre(consulta, 'carpeta.nombre', nombre);

    const [data, records] = await consulta
      .orderBy('carpeta.nombre', 'ASC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      data,
      metadata: {
        records,
        frame: page,
        frameSize: size,
        lastFrame: Math.max(1, Math.ceil(records / size)),
      },
    };
  }

  async findOneFolder(id: number): Promise<Folder> {
    const folder = await this.folderDAO.findOne({ where: { id } });

    if (!folder) {
      throw new HttpException(
        { message: 'Carpeta no encontrada', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return folder;
  }

  /**
   * Arbol completo de carpetas, ya anidado.
   * Admite acotarlo a la documentacion de un cliente o de un inmueble: en ese
   * caso la raiz del arbol devuelto es la carpeta raiz de esa entidad.
   */
  async getFolderTree(filtro: {
    clienteId?: number;
    propiedadId?: number;
  } = {}): Promise<ItFolderNode[]> {
    const carpetas = await this.folderDAO.find({ order: { nombre: 'ASC' } });

    const conteos = await this.fileDocDAO
      .createQueryBuilder('fichero')
      .select('fichero.folderId', 'folderId')
      .addSelect('COUNT(fichero.id)', 'total')
      .where('fichero.folderId IS NOT NULL')
      .groupBy('fichero.folderId')
      .getRawMany<{ folderId: number; total: string }>();

    const totalPorCarpeta = new Map<number, number>();
    for (const fila of conteos) {
      totalPorCarpeta.set(Number(fila.folderId), Number(fila.total));
    }

    const nodos = new Map<number, ItFolderNode>();
    for (const carpeta of carpetas) {
      nodos.set(carpeta.id, {
        id: carpeta.id,
        nombre: carpeta.nombre,
        parentId: carpeta.parentId ?? null,
        clienteId: carpeta.clienteId ?? null,
        propiedadId: carpeta.propiedadId ?? null,
        esRaiz: carpeta.esRaiz,
        totalFicheros: totalPorCarpeta.get(carpeta.id) ?? 0,
        hijos: [],
      });
    }

    const raices: ItFolderNode[] = [];
    for (const carpeta of carpetas) {
      const nodo = nodos.get(carpeta.id);
      const padre = carpeta.parentId ? nodos.get(carpeta.parentId) : null;
      if (padre) {
        padre.hijos.push(nodo);
      } else {
        raices.push(nodo);
      }
    }

    // Vista filtrada: se devuelve solo la rama del cliente o del inmueble.
    if (filtro.clienteId || filtro.propiedadId) {
      const pertenece = (carpeta: Folder) =>
        (filtro.clienteId && carpeta.clienteId === filtro.clienteId) ||
        (filtro.propiedadId && carpeta.propiedadId === filtro.propiedadId);

      const idsRama = carpetas.filter(pertenece).map((carpeta) => carpeta.id);
      return idsRama
        .map((id) => nodos.get(id))
        .filter((nodo) => nodo && !idsRama.includes(nodo.parentId));
    }

    return raices;
  }

  /** Ruta desde la raiz hasta la carpeta indicada, ambas incluidas. */
  async getBreadcrumb(folderId: number): Promise<ItFolderBreadcrumb[]> {
    const ruta: ItFolderBreadcrumb[] = [];
    let actual = await this.findOneFolder(folderId);
    const visitados = new Set<number>();

    while (actual && !visitados.has(actual.id)) {
      visitados.add(actual.id);
      ruta.unshift({ id: actual.id, nombre: actual.nombre });
      actual = actual.parentId
        ? await this.folderDAO.findOne({ where: { id: actual.parentId } })
        : null;
    }

    return ruta;
  }

  async updateFolder(id: number, dto: UpdateFolderDto): Promise<Folder> {
    const folder = await this.findOneFolder(id);

    if (dto.nombre !== undefined) {
      const nombre = sanearNombre(dto.nombre);
      if (!nombre) {
        throw new HttpException(
          { message: 'El nombre de la carpeta no es válido', flag: Flag.VALIDATION_ERROR },
          HttpStatus.BAD_REQUEST,
        );
      }
      folder.nombre = nombre;
    }

    if (dto.parentId !== undefined) {
      await this.validarDestinoCarpeta(folder, dto.parentId);
      folder.parentId = dto.parentId ?? null;
    }

    // Renombrar y mover pueden dejar dos hermanas con el mismo nombre, que en
    // el arbol son indistinguibles: se comprueba con el nombre y el destino ya
    // resueltos, valga uno de los dos o los dos a la vez.
    await this.asegurarNombreLibre(folder.nombre, folder.parentId ?? null, folder.id);

    if (dto.clienteId !== undefined) folder.clienteId = dto.clienteId ?? null;
    if (dto.propiedadId !== undefined) folder.propiedadId = dto.propiedadId ?? null;

    return this.folderDAO.save(folder);
  }

  /** Mueve una carpeta. Sin `parentId` la lleva a la raiz del Drive. */
  async moveFolder(id: number, parentId?: number): Promise<Folder> {
    const folder = await this.findOneFolder(id);
    await this.validarDestinoCarpeta(folder, parentId);
    await this.asegurarNombreLibre(folder.nombre, parentId ?? null, folder.id);
    folder.parentId = parentId ?? null;
    return this.folderDAO.save(folder);
  }

  /**
   * Borrado logico en cascada: la carpeta, su subarbol y los ficheros que
   * contienen. El binario permanece en disco.
   */
  async removeFolder(id: number): Promise<void> {
    const folder = await this.findOneFolder(id);
    const ids = await this.recolectarSubarbol(folder.id);

    await this.fileDocDAO.softDelete({ folderId: In(ids) });
    await this.folderDAO.softDelete({ id: In(ids) });

    this.logger.log(
      `Carpeta borrada: ${folder.nombre} (id ${folder.id}) junto a ${ids.length - 1} subcarpeta(s)`,
    );
  }

  /**
   * Devuelve (creandola si hace falta) la carpeta raiz de un cliente o de un
   * inmueble. Es idempotente: la llaman `clients/` y `properties/` cada vez que
   * vinculan documentacion, y siempre obtienen la misma carpeta.
   */
  async ensureRootFolder(
    dto: EnsureRootFolderDto,
    createdById?: number,
  ): Promise<Folder> {
    const { clienteId, propiedadId } = dto;

    if (!clienteId && !propiedadId) {
      throw new HttpException(
        {
          message: 'Indica el cliente o el inmueble para crear su carpeta raíz',
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const where = clienteId
      ? { clienteId, esRaiz: true }
      : { propiedadId, esRaiz: true };

    const existente = await this.folderDAO.findOne({ where });
    if (existente) return existente;

    const nombrePorDefecto = clienteId
      ? `Cliente #${clienteId}`
      : `Inmueble #${propiedadId}`;

    const folder = this.folderDAO.create({
      nombre: sanearNombre(dto.nombre) || nombrePorDefecto,
      parentId: null,
      clienteId: clienteId ?? null,
      propiedadId: propiedadId ?? null,
      esRaiz: true,
      createdById: createdById ?? null,
    });

    const guardada = await this.folderDAO.save(folder);
    this.logger.log(`Carpeta raíz creada: ${guardada.nombre} (id ${guardada.id})`);

    return guardada;
  }

  // -------------------------------------------------------------------------
  // Ficheros
  // -------------------------------------------------------------------------

  /**
   * Registra en base de datos un binario que multer ya escribio en disco.
   * Si llega vinculado a cliente o inmueble sin carpeta explicita, se deposita
   * en la carpeta raiz de esa entidad (creandola si aun no existe).
   */
  async createFile(
    file: Express.Multer.File,
    dto: CreateFileDocDto,
    uploadedById?: number,
  ): Promise<FileDoc> {
    if (!file) {
      throw new HttpException(
        { message: 'No se ha recibido ningún fichero', flag: Flag.PRECONDITION_FAILED },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Multer entrega el nombre original en latin1: sin esta conversion los
    // acentos de "Nota simple Príncipe.pdf" llegan rotos a la base de datos.
    const nombreOriginal = Buffer.from(file.originalname, 'latin1').toString('utf8');

    let folderId = dto.folderId ?? null;

    if (folderId) {
      await this.findOneFolder(folderId);
    } else if (dto.clienteId || dto.propiedadId) {
      const raiz = await this.ensureRootFolder(
        { clienteId: dto.clienteId, propiedadId: dto.propiedadId },
        uploadedById,
      );
      folderId = raiz.id;
    }

    const fichero = this.fileDocDAO.create({
      nombre: sanearNombre(dto.nombre) || sanearNombre(nombreOriginal),
      nombreOriginal,
      nombreAlmacenado: file.filename,
      mime: this.resolverMime(file.mimetype, nombreOriginal),
      tamano: file.size ?? 0,
      ruta: `${SUBCARPETA_DOCS}/${file.filename}`,
      folderId,
      clienteId: dto.clienteId ?? null,
      propiedadId: dto.propiedadId ?? null,
      version: 1,
      uploadedById: uploadedById ?? null,
    });

    const guardado = await this.fileDocDAO.save(fichero);
    this.logger.log(`Fichero subido: ${guardado.nombre} (id ${guardado.id})`);

    return guardado;
  }

  async findAllFiles(dto: FindAllFileDocDto): Promise<ItFindAllResponse<FileDoc>> {
    const {
      page = 1,
      size = 10,
      folderId,
      clienteId,
      propiedadId,
      nombre,
      soloRaiz,
    } = dto;

    const consulta = this.fileDocDAO.createQueryBuilder('fichero');

    if (folderId) consulta.andWhere('fichero.folderId = :folderId', { folderId });
    else if (soloRaiz) consulta.andWhere('fichero.folderId IS NULL');
    if (clienteId) consulta.andWhere('fichero.clienteId = :clienteId', { clienteId });
    if (propiedadId) {
      consulta.andWhere('fichero.propiedadId = :propiedadId', { propiedadId });
    }
    if (nombre) this.filtrarPorNombre(consulta, 'fichero.nombre', nombre);

    const [data, records] = await consulta
      .orderBy('fichero.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      data,
      metadata: {
        records,
        frame: page,
        frameSize: size,
        lastFrame: Math.max(1, Math.ceil(records / size)),
      },
    };
  }

  async findOneFile(id: number): Promise<FileDoc> {
    const fichero = await this.fileDocDAO.findOne({
      where: { id },
      relations: ['folder'],
    });

    if (!fichero) {
      throw new HttpException(
        { message: 'Documento no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return fichero;
  }

  async updateFile(id: number, dto: UpdateFileDocDto): Promise<FileDoc> {
    const fichero = await this.findOneFile(id);

    if (dto.nombre !== undefined) {
      const nombre = sanearNombre(dto.nombre);
      if (!nombre) {
        throw new HttpException(
          { message: 'El nombre del documento no es válido', flag: Flag.VALIDATION_ERROR },
          HttpStatus.BAD_REQUEST,
        );
      }
      this.asegurarExtension(fichero, nombre);
      fichero.nombre = nombre;
    }

    if (dto.folderId !== undefined) {
      if (dto.folderId) await this.findOneFolder(dto.folderId);
      fichero.folderId = dto.folderId ?? null;
    }

    if (dto.clienteId !== undefined) fichero.clienteId = dto.clienteId ?? null;
    if (dto.propiedadId !== undefined) fichero.propiedadId = dto.propiedadId ?? null;

    return this.fileDocDAO.save(fichero);
  }

  /** Mueve un fichero. Sin `folderId` lo lleva a la raiz del Drive. */
  async moveFile(id: number, folderId?: number): Promise<FileDoc> {
    const fichero = await this.findOneFile(id);

    if (folderId) {
      await this.findOneFolder(folderId);
    }

    fichero.folderId = folderId ?? null;
    return this.fileDocDAO.save(fichero);
  }

  /**
   * Mueve de golpe todos los documentos indicados (seleccion multiple del Drive).
   *
   * Va en una transaccion para que el lote entre entero o no entre: media
   * seleccion movida y media donde estaba es peor que no haber movido nada.
   * Los ids que no existen o que ya estaban borrados no rompen la operacion, se
   * cuentan como omitidos: la seleccion del navegador puede haber envejecido si
   * otra persona usuaria borro un documento mientras tanto.
   */
  async moveFilesBulk(
    dto: MoveBulkFileDocDto,
  ): Promise<{ movidos: number; omitidos: number }> {
    const ids = [...new Set(dto.ids)];
    const destino = dto.folderId ?? null;

    return this.dataSource.transaction(async (manager: EntityManager) => {
      if (destino) {
        const carpeta = await manager.findOne(Folder, { where: { id: destino } });

        if (!carpeta) {
          throw new HttpException(
            { message: 'Carpeta no encontrada', flag: Flag.NOT_FOUND },
            HttpStatus.NOT_FOUND,
          );
        }
      }

      // `find` ya descarta los borrados logicamente: lo que no vuelve de aqui
      // es justo lo que hay que omitir.
      const ficheros = await manager.find(FileDoc, {
        where: { id: In(ids) },
        select: ['id'],
      });

      if (ficheros.length > 0) {
        await manager.update(
          FileDoc,
          { id: In(ficheros.map((fichero) => fichero.id)) },
          { folderId: destino },
        );
      }

      this.logger.log(
        `Movimiento en masa: ${ficheros.length} documento(s) a ${
          destino ? `la carpeta ${destino}` : 'la raíz'
        } (${ids.length - ficheros.length} omitido(s))`,
      );

      return { movidos: ficheros.length, omitidos: ids.length - ficheros.length };
    });
  }

  /** Borrado logico. El binario se conserva en disco. */
  async removeFile(id: number): Promise<void> {
    const fichero = await this.findOneFile(id);
    await this.fileDocDAO.softRemove(fichero);
    this.logger.log(`Documento borrado: ${fichero.nombre} (id ${fichero.id})`);
  }

  /** Fichero + su ruta absoluta, comprobando que el binario sigue en disco. */
  async getFileEnDisco(id: number): Promise<{ fichero: FileDoc; rutaAbsoluta: string }> {
    const fichero = await this.findOneFile(id);
    const rutaAbsoluta = toAbsolutePath(fichero.ruta);

    if (!existsSync(rutaAbsoluta)) {
      throw new HttpException(
        { message: 'El fichero ya no está disponible en el almacén', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return { fichero, rutaAbsoluta };
  }

  /** Flujo de lectura para servir la descarga sin cargar el fichero en memoria. */
  async getFileStream(id: number): Promise<{ fichero: FileDoc; stream: ReadStream }> {
    const { fichero, rutaAbsoluta } = await this.getFileEnDisco(id);
    return { fichero, stream: createReadStream(rutaAbsoluta) };
  }

  /**
   * Sobrescribe el contenido de un fichero con una version nueva y sube el
   * contador de version. Lo usa el callback de ONLYOFFICE tras cada guardado.
   */
  async reemplazarContenido(id: number, contenido: Buffer): Promise<FileDoc> {
    const fichero = await this.findOneFile(id);
    const rutaAbsoluta = toAbsolutePath(fichero.ruta);

    ensureDocsDir();
    writeFileSync(rutaAbsoluta, contenido);

    fichero.tamano = contenido.length;
    fichero.version += 1;

    const actualizado = await this.fileDocDAO.save(fichero);
    this.logger.log(
      `Documento actualizado desde ONLYOFFICE: ${actualizado.nombre} (versión ${actualizado.version})`,
    );

    return actualizado;
  }

  /**
   * Duplica el binario en disco y crea el registro correspondiente.
   * Sirve para "guardar como" desde el editor sin perder la version anterior.
   */
  async duplicarFichero(id: number, nombreNuevo?: string): Promise<FileDoc> {
    const { fichero, rutaAbsoluta } = await this.getFileEnDisco(id);
    const nombreAlmacenado = generarNombreAlmacenado(fichero.nombre);
    const destinoAbsoluto = toAbsolutePath(`${SUBCARPETA_DOCS}/${nombreAlmacenado}`);

    const contenido = createReadStream(rutaAbsoluta);
    await new Promise<void>((cumplir, fallar) => {
      const trozos: Buffer[] = [];
      contenido.on('data', (trozo: string | Buffer) => {
        trozos.push(Buffer.from(trozo));
      });
      contenido.on('error', fallar);
      contenido.on('end', () => {
        writeFileSync(destinoAbsoluto, Buffer.concat(trozos));
        cumplir();
      });
    });

    const copia = this.fileDocDAO.create({
      nombre: sanearNombre(nombreNuevo) || `Copia de ${fichero.nombre}`,
      nombreOriginal: fichero.nombreOriginal,
      nombreAlmacenado,
      mime: fichero.mime,
      tamano: fichero.tamano,
      ruta: `${SUBCARPETA_DOCS}/${nombreAlmacenado}`,
      folderId: fichero.folderId,
      clienteId: fichero.clienteId,
      propiedadId: fichero.propiedadId,
      version: 1,
      uploadedById: fichero.uploadedById,
    });

    return this.fileDocDAO.save(copia);
  }

  // -------------------------------------------------------------------------
  // Utilidades internas
  // -------------------------------------------------------------------------

  /**
   * MIME definitivo del fichero subido.
   *
   * No basta con `file.mimetype || respaldo`: multer SIEMPRE rellena ese campo y,
   * cuando el cliente no declara el tipo, lo hace con `application/octet-stream`,
   * de modo que el respaldo nunca entraba. Un PDF guardado como octet-stream se
   * sirve con esa cabecera y el visor embebido del front lo descarga en vez de
   * mostrarlo. Ante un tipo ausente o generico, manda la extension.
   */
  private resolverMime(mimeCliente: string | undefined, nombre: string): string {
    const esGenerico = !mimeCliente || mimeCliente === 'application/octet-stream';
    return esGenerico ? getMimePorExtension(nombre) : mimeCliente;
  }

  /**
   * Anade a la consulta el filtro por nombre ignorando mayusculas Y tildes:
   * «atico» encuentra «Ático» y «senorio» encuentra «señorío».
   */
  private filtrarPorNombre(
    consulta: SelectQueryBuilder<Folder> | SelectQueryBuilder<FileDoc>,
    columna: string,
    nombre: string,
  ): void {
    consulta.andWhere(
      `${columnaSinTildes(columna, this.unaccentDisponible)} ILIKE :patron`,
      { patron: `%${quitarTildes(nombre)}%` },
    );
  }

  /**
   * Comprueba que no haya ya una carpeta con ese nombre colgando del mismo
   * padre. Lo usan el alta, el renombrado y el movimiento: dos hermanas con el
   * mismo nombre son indistinguibles en el arbol y reparten los documentos
   * entre las dos sin que nadie sepa cual es cual.
   */
  private async asegurarNombreLibre(
    nombre: string,
    parentId: number | null,
    idExcluido?: number,
  ): Promise<void> {
    const hermana = await this.folderDAO.findOne({
      where: { nombre, parentId: parentId ?? IsNull() },
    });

    if (hermana && hermana.id !== idExcluido) {
      throw new HttpException(
        { message: 'Ya existe una carpeta con ese nombre en esta ubicación', flag: Flag.CONFLICT },
        HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * Un renombrado no puede cambiar ni quitar la extension.
   *
   * El visor, el editor y el icono se eligen por la extension del nombre, asi
   * que «nota-simple.pdf» → «Nota simple registro» deja el documento mudo: ni
   * se previsualiza ni ONLYOFFICE lo vuelve a abrir, aunque el binario siga
   * intacto. La interfaz ya solo deja editar la parte del nombre, y esto cierra
   * la puerta a quien llame a la API directamente.
   */
  private asegurarExtension(fichero: FileDoc, nombreNuevo: string): void {
    // Si el documento perdio la extension en el pasado, se toma la del nombre
    // con el que se subio: asi un fichero ya roto se puede reparar.
    const esperada = getExtension(fichero.nombre) || getExtension(fichero.nombreOriginal);

    if (!esperada || getExtension(nombreNuevo) === esperada) return;

    throw new HttpException(
      {
        message: `El nombre debe terminar en «.${esperada}»: la extensión es la que permite abrir el documento dentro del CRM`,
        flag: Flag.VALIDATION_ERROR,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Evita que una carpeta acabe dentro de si misma o de un descendiente suyo:
   * el ciclo dejaria una rama huerfana e invisible en el arbol.
   */
  private async validarDestinoCarpeta(
    folder: Folder,
    parentId?: number,
  ): Promise<void> {
    if (!parentId) return;

    if (parentId === folder.id) {
      throw new HttpException(
        { message: 'Una carpeta no puede contenerse a sí misma', flag: Flag.PRECONDITION_FAILED },
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.findOneFolder(parentId);

    const descendientes = await this.recolectarSubarbol(folder.id);
    if (descendientes.includes(parentId)) {
      throw new HttpException(
        {
          message: 'No se puede mover una carpeta dentro de una de sus subcarpetas',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /** Ids de la carpeta indicada y de todo su subarbol. */
  private async recolectarSubarbol(folderId: number): Promise<number[]> {
    const todas = await this.folderDAO.find({ select: ['id', 'parentId'] });
    const hijosPorPadre = new Map<number, number[]>();

    for (const carpeta of todas) {
      if (!carpeta.parentId) continue;
      const lista = hijosPorPadre.get(carpeta.parentId) ?? [];
      lista.push(carpeta.id);
      hijosPorPadre.set(carpeta.parentId, lista);
    }

    const recogidos: number[] = [];
    const pendientes = [folderId];

    while (pendientes.length) {
      const actual = pendientes.pop();
      if (recogidos.includes(actual)) continue;
      recogidos.push(actual);
      pendientes.push(...(hijosPorPadre.get(actual) ?? []));
    }

    return recogidos;
  }

  /** Borrado fisico del binario. Reservado a tareas de mantenimiento. */
  eliminarBinario(rutaRelativa: string): void {
    const rutaAbsoluta = toAbsolutePath(rutaRelativa);
    if (existsSync(rutaAbsoluta)) {
      unlinkSync(rutaAbsoluta);
    }
  }
}
