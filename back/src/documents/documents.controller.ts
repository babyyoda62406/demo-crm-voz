import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  Headers,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { OnlyOfficeService } from './onlyoffice.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FindAllFolderDto } from './dto/find-all-folder.dto';
import { CreateFileDocDto } from './dto/create-file-doc.dto';
import { UpdateFileDocDto } from './dto/update-file-doc.dto';
import { FindAllFileDocDto } from './dto/find-all-file-doc.dto';
import {
  MoveBulkFileDocDto,
  MoveFileDocDto,
  MoveFolderDto,
} from './dto/move-file-doc.dto';
import { EnsureRootFolderDto } from './dto/ensure-root-folder.dto';
import { ItOnlyOfficeCallbackBody } from './interfaces/it-onlyoffice.interface';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import { Flag } from '../common/enums/flag.enum';
import {
  documentsDiskStorage,
  LIMITE_TAMANO_SUBIDA,
} from './helpers/storage.helper';

/**
 * Drive documental de CRMIA: carpetas, ficheros y edicion con ONLYOFFICE.
 *
 * ORDEN DE LAS RUTAS: NestJS resuelve por orden de declaracion. El bloque
 * `folders/...` va primero para que `GET /documents/folders` no lo capture
 * `GET /documents/:id`.
 */
@ApiTags('Documentos')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly onlyOfficeService: OnlyOfficeService,
  ) {}

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo de documentos operativo' })
  ping() {
    return {
      message: 'Módulo de documentos operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }

  // -------------------------------------------------------------------------
  // Carpetas
  // -------------------------------------------------------------------------

  @Get('folders/tree')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiOperation({ summary: 'Árbol completo de carpetas del Drive' })
  @ApiResponse({ status: 200, description: 'Árbol de carpetas obtenido' })
  async getTree(
    @Query('clienteId') clienteId?: string,
    @Query('propiedadId') propiedadId?: string,
  ) {
    const data = await this.documentsService.getFolderTree({
      clienteId: clienteId ? Number(clienteId) : undefined,
      propiedadId: propiedadId ? Number(propiedadId) : undefined,
    });

    return {
      message: 'Árbol de carpetas obtenido correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Post('folders/root')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_DOCUMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Carpeta raíz de un cliente o inmueble (la crea si no existe)',
  })
  @ApiResponse({ status: 201, description: 'Carpeta raíz disponible' })
  async ensureRoot(
    @Body() dto: EnsureRootFolderDto,
    @GetUser() usuario: ItJwtPayload,
  ) {
    const data = await this.documentsService.ensureRootFolder(dto, usuario?.id);

    return {
      message: 'Carpeta raíz disponible',
      flag: Flag.CREATED,
      data,
    };
  }

  @Post('folders')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_DOCUMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una carpeta' })
  @ApiResponse({ status: 201, description: 'Carpeta creada correctamente' })
  async createFolder(
    @Body() dto: CreateFolderDto,
    @GetUser() usuario: ItJwtPayload,
  ) {
    const data = await this.documentsService.createFolder(dto, usuario?.id);

    return {
      message: 'Carpeta creada correctamente',
      flag: Flag.CREATED,
      data,
    };
  }

  @Get('folders')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiOperation({ summary: 'Listado paginado de carpetas' })
  @ApiResponse({ status: 200, description: 'Carpetas obtenidas correctamente' })
  async findAllFolders(@Query() dto: FindAllFolderDto) {
    const data = await this.documentsService.findAllFolders(dto);

    return {
      message: 'Carpetas obtenidas correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('folders/:id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Detalle de una carpeta' })
  @ApiResponse({ status: 200, description: 'Carpeta obtenida correctamente' })
  async findOneFolder(@Param('id', ParseIntPipe) id: number) {
    const data = await this.documentsService.findOneFolder(id);

    return {
      message: 'Carpeta obtenida correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('folders/:id/breadcrumb')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Ruta de navegación hasta la carpeta' })
  @ApiResponse({ status: 200, description: 'Ruta obtenida correctamente' })
  async getBreadcrumb(@Param('id', ParseIntPipe) id: number) {
    const data = await this.documentsService.getBreadcrumb(id);

    return {
      message: 'Ruta obtenida correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Patch('folders/:id/move')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Mover una carpeta (sin destino, va a la raíz)' })
  @ApiResponse({ status: 200, description: 'Carpeta movida correctamente' })
  async moveFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveFolderDto,
  ) {
    const data = await this.documentsService.moveFolder(id, dto.parentId);

    return {
      message: 'Carpeta movida correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Patch('folders/:id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Renombrar o revincular una carpeta' })
  @ApiResponse({ status: 200, description: 'Carpeta actualizada correctamente' })
  async updateFolder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFolderDto,
  ) {
    const data = await this.documentsService.updateFolder(id, dto);

    return {
      message: 'Carpeta actualizada correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Delete('folders/:id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Borrar una carpeta y su contenido (borrado lógico)' })
  @ApiResponse({ status: 200, description: 'Carpeta borrada correctamente' })
  async removeFolder(@Param('id', ParseIntPipe) id: number) {
    await this.documentsService.removeFolder(id);

    return {
      message: 'Carpeta borrada correctamente',
      flag: Flag.DELETED,
      data: null as null,
    };
  }

  // -------------------------------------------------------------------------
  // Ficheros
  // -------------------------------------------------------------------------

  @Post('upload')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_DOCUMENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: documentsDiskStorage,
      limits: { fileSize: LIMITE_TAMANO_SUBIDA },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: { type: 'number' },
        clienteId: { type: 'number' },
        propiedadId: { type: 'number' },
        nombre: { type: 'string' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subir un documento al Drive' })
  @ApiResponse({ status: 201, description: 'Documento subido correctamente' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFileDocDto,
    @GetUser() usuario: ItJwtPayload,
  ) {
    const data = await this.documentsService.createFile(file, dto, usuario?.id);

    return {
      message: 'Documento subido correctamente',
      flag: Flag.DOCUMENT_UPLOADED,
      data,
    };
  }

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiOperation({ summary: 'Listado paginado de documentos' })
  @ApiResponse({ status: 200, description: 'Documentos obtenidos correctamente' })
  async findAllFiles(@Query() dto: FindAllFileDocDto) {
    const data = await this.documentsService.findAllFiles(dto);

    return {
      message: 'Documentos obtenidos correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  /**
   * Movimiento en masa desde la seleccion multiple del Drive.
   *
   * Va declarado antes que `PATCH /documents/:id`: si no, `move-bulk` caeria en
   * el parametro `:id` y lo rechazaria el `ParseIntPipe`.
   */
  @Patch('move-bulk')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_DOCUMENT)
  @ApiOperation({ summary: 'Mover varios documentos a la vez (sin destino, a la raíz)' })
  @ApiResponse({ status: 200, description: 'Documentos movidos correctamente' })
  async moveBulk(@Body() dto: MoveBulkFileDocDto) {
    const data = await this.documentsService.moveFilesBulk(dto);

    return {
      message: 'Documentos movidos correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  // ---------------------------------------------------------------------------
  // ONLYOFFICE
  // ---------------------------------------------------------------------------

  @Get(':id/onlyoffice-config')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Configuración firmada del editor ONLYOFFICE' })
  @ApiResponse({ status: 200, description: 'Configuración generada correctamente' })
  async getOnlyOfficeConfig(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() usuario: ItJwtPayload,
  ) {
    const data = await this.onlyOfficeService.getEditorConfig(id, usuario);

    return {
      message: 'Configuración del editor generada correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  /**
   * Notificacion de guardado de ONLYOFFICE.
   *
   * Ruta PUBLICA a proposito: la llama el Document Server, que no dispone de la
   * sesion del CRM. La autenticidad se comprueba dos veces: el token firmado de
   * la query (atado a este documento) y la firma JWT que emite ONLYOFFICE.
   *
   * Devuelve `{ error: 0 }` en crudo, sin el sobre `{ message, flag, data }`:
   * es el contrato literal del Document Server.
   */
  @Post(':id/onlyoffice-callback')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async onlyOfficeCallback(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ItOnlyOfficeCallbackBody,
    @Query('token') token: string,
    @Headers('authorization') autorizacion: string,
  ): Promise<{ error: number }> {
    this.onlyOfficeService.verificarTokenAcceso(token, id);
    return this.onlyOfficeService.procesarCallback(id, body, autorizacion);
  }

  /**
   * Binario del documento para el contenedor de ONLYOFFICE.
   *
   * Ruta PUBLICA con token firmado en la query: el Document Server no puede
   * enviar la cabecera `token` del CRM. El token solo abre ESTE documento y
   * caduca a las 12 horas.
   */
  @Get(':id/raw')
  @ApiExcludeEndpoint()
  async raw(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    this.onlyOfficeService.verificarTokenAcceso(token, id);

    const { fichero, stream } = await this.documentsService.getFileStream(id);

    res.setHeader('Content-Type', fichero.mime);
    res.setHeader('Content-Length', fichero.tamano);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(fichero.nombre)}`,
    );

    stream.pipe(res);
  }

  // -------------------------------------------------------------------------
  // Detalle, descarga y mantenimiento de un documento
  // -------------------------------------------------------------------------

  @Get(':id/download')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Descargar un documento' })
  @ApiResponse({ status: 200, description: 'Documento descargado correctamente' })
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { fichero, stream } = await this.documentsService.getFileStream(id);

    res.setHeader('Content-Type', fichero.mime);
    res.setHeader('Content-Length', fichero.tamano);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fichero.nombre)}`,
    );

    stream.pipe(res);
  }

  @Post(':id/duplicate')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_DOCUMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Duplicar un documento' })
  @ApiResponse({ status: 201, description: 'Documento duplicado correctamente' })
  async duplicate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileDocDto,
  ) {
    const data = await this.documentsService.duplicarFichero(id, dto?.nombre);

    return {
      message: 'Documento duplicado correctamente',
      flag: Flag.CREATED,
      data,
    };
  }

  @Patch(':id/move')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Mover un documento (sin destino, va a la raíz)' })
  @ApiResponse({ status: 200, description: 'Documento movido correctamente' })
  async move(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveFileDocDto,
  ) {
    const data = await this.documentsService.moveFile(id, dto.folderId);

    return {
      message: 'Documento movido correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Detalle de un documento' })
  @ApiResponse({ status: 200, description: 'Documento obtenido correctamente' })
  async findOneFile(@Param('id', ParseIntPipe) id: number) {
    const data = await this.documentsService.findOneFile(id);

    return {
      message: 'Documento obtenido correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Patch(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Renombrar o revincular un documento' })
  @ApiResponse({ status: 200, description: 'Documento actualizado correctamente' })
  async updateFile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFileDocDto,
  ) {
    const data = await this.documentsService.updateFile(id, dto);

    return {
      message: 'Documento actualizado correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_DOCUMENT)
  @ApiParam({ name: 'id', type: 'number' })
  @ApiOperation({ summary: 'Borrar un documento (borrado lógico)' })
  @ApiResponse({ status: 200, description: 'Documento borrado correctamente' })
  async removeFile(@Param('id', ParseIntPipe) id: number) {
    await this.documentsService.removeFile(id);

    return {
      message: 'Documento borrado correctamente',
      flag: Flag.DELETED,
      data: null as null,
    };
  }
}
