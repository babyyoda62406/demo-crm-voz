import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { ContractsService } from './contracts.service';
import { ContractTemplatesService } from './contract-templates.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { Flag } from '../common/enums/flag.enum';

import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { FindAllContractDto } from './dto/find-all-contract.dto';
import { SendContractDto } from './dto/send-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { CreateProrrogaDto } from './dto/create-prorroga.dto';
import {
  CONTRACT_STATE_FLOW,
  ContractState,
  ContractStateColors,
  ContractStateLabels,
} from './enums/contract-state.enum';
import {
  renderPublicSignErrorPage,
  renderPublicSignPage,
} from './helpers/public-sign-page.helper';

/**
 * Controlador del dominio Contratos.
 *
 * ORDEN DE RUTAS: las rutas literales (`templates`, `estados`, `public/...`)
 * se declaran ANTES que las parametricas (`:id`) para que Nest no las capture.
 */
@ApiTags('Contratos')
@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly templatesService: ContractTemplatesService,
  ) {}

  // =========================================================================
  // Rutas publicas (sin autenticacion): enlace de firma
  // =========================================================================

  /**
   * Pagina de firma en HTML plano.
   *
   * Los errores se capturan aqui a proposito: esta ruta la abre el cliente
   * final en su navegador, y un enlace cortado al pegarlo en WhatsApp le
   * mostraba el JSON crudo del filtro de excepciones.
   */
  @Get('public/:token')
  @ApiExcludeEndpoint()
  async publicPage(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const contrato = await this.contractsService.findByPublicToken(token);
      const vista = this.contractsService.toPublicView(contrato);
      res.type('html').send(renderPublicSignPage(vista, token));
    } catch (error) {
      const respuesta =
        error instanceof HttpException
          ? (error.getResponse() as { message?: string })
          : null;

      res
        .status(
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR,
        )
        .type('html')
        .send(
          renderPublicSignErrorPage(
            respuesta?.message ??
              'El enlace de firma no es válido o ya no está activo.',
          ),
        );
    }
  }

  @Get('public/:token/estado')
  @ApiOperation({
    summary: 'Estado público de un contrato a partir de su enlace de firma',
  })
  @ApiResponse({ status: 200, description: 'Contrato recuperado correctamente' })
  async publicState(@Param('token') token: string) {
    const contrato = await this.contractsService.findByPublicToken(token);
    return {
      message: 'Contrato recuperado correctamente',
      flag: Flag.SUCCESS,
      data: this.contractsService.toPublicView(contrato),
    };
  }

  @Get('public/:token/pdf')
  @ApiOperation({ summary: 'PDF del contrato desde el enlace público' })
  async publicPdf(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const fichero = await this.contractsService.getPublicPdf(token);
    res.setHeader('Content-Type', fichero.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fichero.filename}"`,
    );
    // Al firmar, el PDF se rehace con la diligencia bajo la MISMA URL: si el
    // navegador lo cachea, el cliente se descarga la version sin firmar.
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.send(fichero.buffer);
  }

  @Post('public/:token/sign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Firmar el contrato desde el enlace público' })
  @ApiResponse({ status: 200, description: 'Contrato firmado correctamente' })
  async publicSign(
    @Param('token') token: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;

    const contrato = await this.contractsService.firmarPorToken(token, dto, ip);

    return {
      message: 'Documento firmado correctamente. Gracias.',
      flag: Flag.DOCUMENT_SIGNED,
      data: this.contractsService.toPublicView(contrato),
    };
  }

  // =========================================================================
  // Catalogo de plantillas y metadatos
  // =========================================================================

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo de contratos operativo' })
  ping() {
    return {
      message: 'Módulo de contratos operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }

  @Get('estados')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Catálogo de estados con su etiqueta y color' })
  @ApiResponse({ status: 200, description: 'Estados recuperados correctamente' })
  estados() {
    return {
      message: 'Estados recuperados correctamente',
      flag: Flag.SUCCESS,
      data: Object.values(ContractState).map((estado) => ({
        value: estado,
        label: ContractStateLabels[estado],
        color: ContractStateColors[estado],
        orden: CONTRACT_STATE_FLOW.indexOf(estado),
      })),
    };
  }

  @Get('templates')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Listar las plantillas de contrato con sus campos' })
  @ApiResponse({ status: 200, description: 'Plantillas recuperadas correctamente' })
  async findTemplates() {
    const data = await this.templatesService.findAll();
    return {
      message: 'Plantillas recuperadas correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('templates/:key')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Obtener una plantilla y la definición de sus campos' })
  @ApiParam({ name: 'key', example: 'alquiler-temporal' })
  @ApiResponse({ status: 200, description: 'Plantilla recuperada correctamente' })
  async findTemplate(@Param('key') key: string) {
    const data = await this.templatesService.findByKey(key);
    return {
      message: 'Plantilla recuperada correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  // =========================================================================
  // CRUD de contratos
  // =========================================================================

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Listar contratos' })
  @ApiResponse({ status: 200, description: 'Contratos recuperados correctamente' })
  async findAll(@Query() dto: FindAllContractDto) {
    return await this.contractsService.findAll(dto);
  }

  @Post()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_CONTRACT)
  @ApiOperation({
    summary: 'Generar un contrato a partir de una plantilla (.docx + .pdf)',
  })
  @ApiResponse({ status: 201, description: 'Contrato generado correctamente' })
  async create(@Body() dto: CreateContractDto) {
    const data = await this.contractsService.create(dto);
    return {
      message: 'Contrato generado correctamente',
      flag: Flag.CONTRACT_GENERATED,
      data,
    };
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Obtener un contrato por id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Contrato recuperado correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.contractsService.findOne(id);
    return {
      message: 'Contrato recuperado correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Patch(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CONTRACT)
  @ApiOperation({ summary: 'Actualizar los datos de un contrato y regenerarlo' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Contrato actualizado correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
  ) {
    const data = await this.contractsService.update(id, dto);
    return {
      message: 'Contrato actualizado correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_CONTRACT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un contrato y sus documentos' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Contrato eliminado correctamente' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.contractsService.remove(id);
    return {
      message: 'Contrato eliminado correctamente',
      flag: Flag.DELETED,
    };
  }

  // =========================================================================
  // Documentos
  // =========================================================================

  @Get(':id/docx')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({ summary: 'Descargar el documento Word del contrato' })
  @ApiParam({ name: 'id', type: 'number' })
  async downloadDocx(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const fichero = await this.contractsService.getFile(id, 'docx');
    res.setHeader('Content-Type', fichero.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fichero.filename}"`,
    );
    res.send(fichero.buffer);
  }

  @Get(':id/pdf')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CONTRACT)
  @ApiOperation({
    summary: 'Obtener el PDF del contrato (inline para previsualizar)',
  })
  @ApiParam({ name: 'id', type: 'number' })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Query('descargar') descargar: string,
    @Res() res: Response,
  ): Promise<void> {
    const fichero = await this.contractsService.getFile(id, 'pdf');
    const disposicion = descargar === 'true' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', fichero.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposicion}; filename="${fichero.filename}"`,
    );
    // El fichero cambia bajo la misma URL cuando el contrato se firma.
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.send(fichero.buffer);
  }

  @Post(':id/pdf')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CONTRACT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar (o reintentar) la conversión del contrato a PDF' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Documentos regenerados correctamente' })
  @ApiResponse({
    status: 503,
    description: 'El servicio de conversión a PDF no está disponible',
  })
  async regeneratePdf(@Param('id', ParseIntPipe) id: number) {
    const data = await this.contractsService.regenerarPdf(id);
    return {
      message: 'El PDF del contrato está listo',
      flag: Flag.UPDATED,
      data,
    };
  }

  // =========================================================================
  // Transiciones de estado
  // =========================================================================

  @Post(':id/send')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CONTRACT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar el contrato a firma y obtener el enlace público',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Contrato enviado correctamente' })
  async send(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendContractDto,
  ) {
    const data = await this.contractsService.enviar(id, dto);
    return {
      message: 'Contrato enviado correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Patch(':id/anular')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_CONTRACT)
  @ApiOperation({ summary: 'Anular un contrato y desactivar su enlace de firma' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Contrato anulado correctamente' })
  async anular(@Param('id', ParseIntPipe) id: number) {
    const data = await this.contractsService.anular(id);
    return {
      message: 'Contrato anulado correctamente',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Post(':id/prorroga')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_CONTRACT)
  @ApiOperation({
    summary: 'Crear una prórroga precargada desde un contrato existente',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 201, description: 'Prórroga generada correctamente' })
  async prorroga(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProrrogaDto,
  ) {
    const data = await this.contractsService.crearProrroga(id, dto);
    return {
      message: 'Prórroga generada correctamente',
      flag: Flag.CONTRACT_GENERATED,
      data,
    };
  }
}
