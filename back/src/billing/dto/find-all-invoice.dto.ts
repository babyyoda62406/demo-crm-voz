import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { InvoiceStatus } from '../enums/invoice-status.enum';

/** Filtros del listado de facturas y del resumen de totales del periodo. */
export class FindAllInvoiceDto extends PaginationDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus, { message: 'El estado de factura no es válido' })
  estado?: InvoiceStatus;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contratoId?: number;

  @ApiPropertyOptional({
    example: 'FRA-2026',
    description: 'Busca en el número de factura y en el nombre del cliente',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha inicial no es válida' })
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha final no es válida' })
  fechaHasta?: string;
}
