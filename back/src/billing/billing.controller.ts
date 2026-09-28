import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FindAllInvoiceDto } from './dto/find-all-invoice.dto';
import { CreateInvoiceFromContractDto } from './dto/create-invoice-from-contract.dto';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import { Flag } from '../common/enums/flag.enum';

/**
 * Controlador del dominio Facturación.
 *
 * Las rutas literales (`invoice/resumen`, `invoice/cliente/:clienteId`) se
 * declaran antes que `invoice/:id` para que el enrutador no las capture como
 * identificadores.
 */
@ApiTags('Facturación')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_INVOICE)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo de facturación operativo' })
  ping() {
    return {
      message: 'Módulo de facturación operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }

  @Post('invoice')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_INVOICE)
  @ApiOperation({ summary: 'Emitir una factura' })
  @ApiResponse({ status: 201, description: 'Factura emitida correctamente' })
  async create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const invoice = await this.billingService.create(createInvoiceDto, user?.id);
    return {
      message: `Factura ${invoice.numero} emitida correctamente`,
      flag: Flag.INVOICE_ISSUED,
      data: invoice,
    };
  }

  @Post('invoice/from-contract')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_INVOICE)
  @ApiOperation({
    summary: 'Emitir una factura desde un contrato',
    description:
      'Precarga concepto, importe y datos del cliente a partir del contrato indicado. Los valores enviados en el cuerpo tienen prioridad sobre los precargados.',
  })
  @ApiResponse({ status: 201, description: 'Factura emitida correctamente' })
  async createFromContract(
    @Body() dto: CreateInvoiceFromContractDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const invoice = await this.billingService.createFromContract(dto, user?.id);
    return {
      message: `Factura ${invoice.numero} emitida a partir del contrato`,
      flag: Flag.INVOICE_ISSUED,
      data: invoice,
    };
  }

  @Get('invoice')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_INVOICE)
  @ApiOperation({ summary: 'Listar facturas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Facturas recuperadas correctamente' })
  async findAll(@Query() dto: FindAllInvoiceDto) {
    return await this.billingService.findAll(dto);
  }

  @Get('invoice/resumen')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_INVOICE)
  @ApiOperation({
    summary: 'Totales del periodo',
    description:
      'Devuelve base imponible, IVA, total, cobrado, pendiente y anulado para los mismos filtros del listado.',
  })
  @ApiResponse({ status: 200, description: 'Resumen calculado correctamente' })
  async resumen(@Query() dto: FindAllInvoiceDto) {
    const data = await this.billingService.resumen(dto);
    return {
      message: 'Resumen de facturación calculado correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('invoice/cliente/:clienteId')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_INVOICE)
  @ApiOperation({ summary: 'Histórico de facturación de un cliente' })
  @ApiParam({ name: 'clienteId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Histórico recuperado correctamente' })
  async findByClient(@Param('clienteId', ParseIntPipe) clienteId: number) {
    const data = await this.billingService.findByClient(clienteId);
    return {
      message: 'Histórico de facturación recuperado correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('invoice/:id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_INVOICE)
  @ApiOperation({ summary: 'Obtener una factura por id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Factura recuperada correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.billingService.findOne(id);
    return {
      message: 'Factura recuperada correctamente',
      flag: Flag.SUCCESS,
      data: invoice,
    };
  }

  @Get('invoice/:id/pdf')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_INVOICE)
  @ApiOperation({ summary: 'Descargar la factura en PDF' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF generado correctamente' })
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName } = await this.billingService.generatePdf(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Patch('invoice/:id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_INVOICE)
  @ApiOperation({ summary: 'Actualizar una factura emitida' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Factura actualizada correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    const invoice = await this.billingService.update(id, updateInvoiceDto);
    return {
      message: `Factura ${invoice.numero} actualizada correctamente`,
      flag: Flag.UPDATED,
      data: invoice,
    };
  }

  @Patch('invoice/:id/cobrar')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_INVOICE)
  @ApiOperation({ summary: 'Marcar una factura como cobrada' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Factura marcada como cobrada' })
  async markAsPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkInvoicePaidDto,
  ) {
    const invoice = await this.billingService.markAsPaid(id, dto);
    return {
      message: `Factura ${invoice.numero} marcada como cobrada`,
      flag: Flag.UPDATED,
      data: invoice,
    };
  }

  @Patch('invoice/:id/descobrar')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_INVOICE)
  @ApiOperation({
    summary: 'Deshacer el cobro de una factura',
    description: 'Devuelve la factura a «emitida» y borra su fecha de cobro.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Cobro deshecho correctamente' })
  async revertPayment(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.billingService.revertPayment(id);
    return {
      message: `Factura ${invoice.numero} vuelve a estar pendiente de cobro`,
      flag: Flag.UPDATED,
      data: invoice,
    };
  }

  @Patch('invoice/:id/anular')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_INVOICE)
  @ApiOperation({ summary: 'Anular una factura' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Factura anulada correctamente' })
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const invoice = await this.billingService.cancel(id);
    return {
      message: `Factura ${invoice.numero} anulada correctamente`,
      flag: Flag.UPDATED,
      data: invoice,
    };
  }

  @Delete('invoice/:id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_INVOICE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar una factura (no permitido)',
    description:
      'Una factura emitida no se elimina: consumiría un número del correlativo. Responde 412 indicando que hay que anularla.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 412, description: 'Las facturas emitidas no se eliminan' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.billingService.remove(id);
    return {
      message: 'Factura eliminada correctamente',
      flag: Flag.DELETED,
      data: null as null,
    };
  }
}
