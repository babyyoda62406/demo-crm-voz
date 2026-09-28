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
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { FindAllPropertyDto } from './dto/find-all-property.dto';
import { MatchPropertiesDto } from './dto/match-properties.dto';
import {
  MAX_PHOTOS_PER_UPLOAD,
  propertyPhotosMulterOptions,
} from './config/photo-upload.config';
import { Auth } from '../auth/decorators/auth.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { Flag } from '../common/enums/flag.enum';

/** Cuerpo multipart documentado en Swagger para la subida de fotos. */
const photosApiBody = {
  schema: {
    type: 'object',
    properties: {
      fotos: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
      },
    },
  },
};

/**
 * Controlador del dominio Inmuebles: cartera, galería de fotos y cruce de
 * coincidencias con el perfil inversor del cliente.
 */
@ApiTags('Inmuebles')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // Las rutas literales van antes que `:id` para que no las capture el parámetro.

  @Get('catalogos')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_PROPERTY)
  @ApiOperation({ summary: 'Catálogos de zonas, tipos y estados con etiqueta y color' })
  @ApiResponse({ status: 200, description: 'Catálogos recuperados correctamente' })
  getCatalogs() {
    return {
      message: 'Catálogos recuperados correctamente',
      flag: Flag.SUCCESS,
      data: this.propertiesService.getCatalogs(),
    };
  }

  @Get('photos/:filename')
  @ApiOperation({
    summary: 'Servir una foto de la cartera',
    description:
      'Acceso público: las etiquetas <img> del navegador no envían la cabecera `token`.',
  })
  @ApiParam({ name: 'filename', type: 'string' })
  @ApiResponse({ status: 200, description: 'Fichero de imagen' })
  servePhoto(@Param('filename') filename: string, @Res() res: Response) {
    res.sendFile(this.propertiesService.resolvePhoto(filename));
  }

  @Post('photos')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_PROPERTY)
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS_PER_UPLOAD, propertyPhotosMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(photosApiBody)
  @ApiOperation({
    summary: 'Subir fotos sin vincularlas todavía a un inmueble',
    description: 'Devuelve las URLs relativas para enviarlas después en `fotos` al crear.',
  })
  @ApiResponse({ status: 201, description: 'Fotos subidas correctamente' })
  uploadPhotos(@UploadedFiles() fotos: Express.Multer.File[]) {
    return {
      message: 'Fotos subidas correctamente',
      flag: Flag.DOCUMENT_UPLOADED,
      data: this.propertiesService.storePhotos(fotos),
    };
  }

  @Delete('photos/:filename')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_PROPERTY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Borrar una foto que aún no pertenece a ningún inmueble',
    description:
      'Para las fotos subidas desde el alta y descartadas antes de guardar.' +
      ' Si la foto ya está en una ficha, se responde 409 y hay que quitarla desde ella.',
  })
  @ApiParam({ name: 'filename', type: 'string' })
  @ApiResponse({ status: 200, description: 'Foto eliminada correctamente' })
  async removeUnlinkedPhoto(@Param('filename') filename: string) {
    await this.propertiesService.removeUnlinkedPhoto(filename);
    return {
      message: 'Foto eliminada correctamente',
      flag: Flag.DELETED,
    };
  }

  @Get('matching/:clientId')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_PROPERTY)
  @ApiOperation({
    summary: 'Coincidencias de la cartera con el perfil inversor de un cliente',
    description:
      'Cruza presupuesto, zonas y tipo del cliente con la cartera y devuelve las' +
      ' propiedades ordenadas por puntuación (0-100) con los motivos de cada una.',
  })
  @ApiParam({ name: 'clientId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Coincidencias calculadas correctamente' })
  async matching(
    @Param('clientId', ParseIntPipe) clientId: number,
    @Query() dto: MatchPropertiesDto,
  ) {
    const data = await this.propertiesService.matchForClient(clientId, dto);
    return {
      message: data.coincidencias.length
        ? 'Coincidencias calculadas correctamente'
        : 'No hay inmuebles que encajen con el perfil del cliente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Post()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_PROPERTY)
  @ApiOperation({ summary: 'Dar de alta un inmueble' })
  @ApiResponse({ status: 201, description: 'Inmueble creado correctamente' })
  async create(@Body() createPropertyDto: CreatePropertyDto) {
    const property = await this.propertiesService.create(createPropertyDto);
    return {
      message: 'Inmueble creado correctamente',
      flag: Flag.PROPERTY_CREATED,
      data: property,
    };
  }

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_PROPERTY)
  @ApiOperation({ summary: 'Listar la cartera de inmuebles con filtros y paginación' })
  @ApiResponse({ status: 200, description: 'Inmuebles recuperados correctamente' })
  async findAll(@Query() dto: FindAllPropertyDto) {
    return await this.propertiesService.findAll(dto);
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_PROPERTY)
  @ApiOperation({ summary: 'Obtener un inmueble por id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Inmueble recuperado correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const property = await this.propertiesService.findOne(id);
    return {
      message: 'Inmueble recuperado correctamente',
      flag: Flag.SUCCESS,
      data: property,
    };
  }

  @Patch(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_PROPERTY)
  @ApiOperation({ summary: 'Actualizar un inmueble' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Inmueble actualizado correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    const property = await this.propertiesService.update(id, updatePropertyDto);
    return {
      message: 'Inmueble actualizado correctamente',
      flag: Flag.UPDATED,
      data: property,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_PROPERTY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un inmueble de la cartera' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Inmueble eliminado correctamente' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.propertiesService.remove(id);
    return {
      message: 'Inmueble eliminado correctamente',
      flag: Flag.DELETED,
    };
  }

  @Post(':id/photos')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_PROPERTY)
  @UseInterceptors(FilesInterceptor('fotos', MAX_PHOTOS_PER_UPLOAD, propertyPhotosMulterOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody(photosApiBody)
  @ApiOperation({ summary: 'Añadir fotos a la galería de un inmueble' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 201, description: 'Fotos añadidas correctamente' })
  async addPhotos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() fotos: Express.Multer.File[],
  ) {
    const property = await this.propertiesService.addPhotos(id, fotos);
    return {
      message: 'Fotos añadidas correctamente',
      flag: Flag.DOCUMENT_UPLOADED,
      data: property,
    };
  }

  @Delete(':id/photos/:filename')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_PROPERTY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar una foto de la galería de un inmueble' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'filename', type: 'string' })
  @ApiResponse({ status: 200, description: 'Foto eliminada correctamente' })
  async removePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('filename') filename: string,
  ) {
    const property = await this.propertiesService.removePhoto(id, filename);
    return {
      message: 'Foto eliminada correctamente',
      flag: Flag.DELETED,
      data: property,
    };
  }
}
