import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { FindAllClientDto } from './dto/find-all-client.dto';
import { MoveStageDto } from './dto/move-stage.dto';
import { DiscardClientDto } from './dto/discard-client.dto';
import { CreateClientActivityDto } from './dto/create-client-activity.dto';
import { FindAllClientActivityDto } from './dto/find-all-client-activity.dto';
import { ImportClientsDto } from './dto/import-clients.dto';
import { BusinessLine } from './enums';
import { MAX_IMPORT_FILE_SIZE } from './helpers/client-import.helper';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import { Flag } from '../common/enums/flag.enum';

/**
 * Controlador del dominio Clientes: CRUD, kanban, descarte, historial e
 * importacion desde CSV / Excel.
 *
 * OJO al orden de las rutas: las estaticas (`/stages`, `/kanban`, `/import`)
 * van declaradas antes que `/:id` para que Nest no intente resolverlas como id.
 */
@ApiTags('Clientes')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // -------------------------------------------------------------------------
  // Catalogos y tablero
  // -------------------------------------------------------------------------

  @Get('stages')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT)
  @ApiOperation({
    summary: 'Catálogo de etapas por línea de negocio (etiquetas y colores)',
  })
  @ApiResponse({ status: 200, description: 'Catálogo recuperado correctamente' })
  getStages() {
    return {
      message: 'Catálogo de etapas recuperado correctamente',
      flag: Flag.SUCCESS,
      data: this.clientsService.getStageCatalog(),
    };
  }

  @Get('kanban')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT)
  @ApiOperation({ summary: 'Tablero kanban de una línea de negocio' })
  @ApiQuery({ name: 'lineaNegocio', required: false, enum: BusinessLine })
  @ApiResponse({ status: 200, description: 'Tablero recuperado correctamente' })
  async getKanban(@Query('lineaNegocio') lineaNegocio?: BusinessLine) {
    const linea = Object.values(BusinessLine).includes(lineaNegocio)
      ? lineaNegocio
      : BusinessLine.PSI;
    const tablero = await this.clientsService.findKanban(linea);

    return {
      message: 'Tablero recuperado correctamente',
      flag: Flag.SUCCESS,
      data: tablero,
    };
  }

  // -------------------------------------------------------------------------
  // Importacion
  // -------------------------------------------------------------------------

  @Post('import')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_CLIENT)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMPORT_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importar clientes desde un CSV o un Excel' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichero .csv, .xlsx, .xls u .ods',
        },
        lineaNegocio: {
          type: 'string',
          enum: Object.values(BusinessLine),
          description: 'Línea de negocio por defecto de las filas importadas',
        },
        tipo: {
          type: 'string',
          description: 'Tipo de cliente por defecto de las filas importadas',
        },
        actualizarExistentes: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Actualizar los clientes cuyo correo ya exista',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Importación procesada' })
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportClientsDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const resumen = await this.clientsService.importFromFile(file, dto, user);

    return {
      message: `Importación finalizada: ${resumen.creados} creados, ${resumen.actualizados} actualizados, ${resumen.omitidos} omitidos`,
      flag: Flag.SUCCESS,
      data: resumen,
    };
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  @Post()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_CLIENT)
  @ApiOperation({ summary: 'Crear un cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado correctamente' })
  async create(
    @Body() createClientDto: CreateClientDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const client = await this.clientsService.create(createClientDto, user);

    return {
      message: 'Cliente creado correctamente',
      flag: Flag.CLIENT_CREATED,
      data: client,
    };
  }

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT)
  @ApiOperation({ summary: 'Listar clientes (paginado y con filtros)' })
  @ApiResponse({ status: 200, description: 'Clientes recuperados correctamente' })
  async findAll(@Query() dto: FindAllClientDto) {
    return await this.clientsService.findAll(dto);
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT)
  @ApiOperation({ summary: 'Ficha de un cliente con su historial' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Cliente recuperado correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const client = await this.clientsService.findOne(id);

    return {
      message: 'Cliente recuperado correctamente',
      flag: Flag.SUCCESS,
      data: client,
    };
  }

  @Patch(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CLIENT)
  @ApiOperation({ summary: 'Actualizar la ficha de un cliente' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClientDto: UpdateClientDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const client = await this.clientsService.update(id, updateClientDto, user);

    return {
      message: 'Cliente actualizado correctamente',
      flag: Flag.UPDATED,
      data: client,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un cliente y su historial' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Cliente eliminado correctamente' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.clientsService.remove(id);

    return {
      message: 'Cliente eliminado correctamente',
      flag: Flag.DELETED,
    };
  }

  // -------------------------------------------------------------------------
  // Pipeline
  // -------------------------------------------------------------------------

  @Patch(':id/stage')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mover un cliente de etapa (arrastre en el kanban)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Etapa actualizada correctamente' })
  async moveStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() moveStageDto: MoveStageDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const client = await this.clientsService.moveStage(id, moveStageDto, user);

    return {
      message: 'Etapa actualizada correctamente',
      flag: Flag.CLIENT_STAGE_MOVED,
      data: client,
    };
  }

  @Patch(':id/discard')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Descartar un cliente indicando el motivo' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Cliente descartado correctamente' })
  async discard(
    @Param('id', ParseIntPipe) id: number,
    @Body() discardClientDto: DiscardClientDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const client = await this.clientsService.discard(id, discardClientDto, user);

    return {
      message: 'Cliente descartado correctamente',
      flag: Flag.UPDATED,
      data: client,
    };
  }

  @Patch(':id/restore')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivar un cliente descartado' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Cliente reactivado correctamente' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: ItJwtPayload,
  ) {
    const client = await this.clientsService.restore(id, user);

    return {
      message: 'Cliente reactivado correctamente',
      flag: Flag.UPDATED,
      data: client,
    };
  }

  // -------------------------------------------------------------------------
  // Historial
  // -------------------------------------------------------------------------

  @Get(':id/activities')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT)
  @ApiOperation({ summary: 'Historial de un cliente (paginado)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Historial recuperado correctamente' })
  async findActivities(
    @Param('id', ParseIntPipe) id: number,
    @Query() dto: FindAllClientActivityDto,
  ) {
    return await this.clientsService.findActivities(id, dto);
  }

  @Post(':id/activities')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CLIENT)
  @ApiOperation({ summary: 'Añadir un apunte al historial de un cliente' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 201, description: 'Actividad registrada correctamente' })
  async addActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateClientActivityDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const actividad = await this.clientsService.addActivity(id, dto, user);

    return {
      message: 'Actividad registrada correctamente',
      flag: Flag.CREATED,
      data: actividad,
    };
  }
}
