import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Marcado de una factura como cobrada. */
export class MarkInvoicePaidDto {
  @ApiPropertyOptional({
    example: '2026-09-15',
    description: 'Fecha de cobro. Si se omite, se usa la fecha de hoy.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cobro no es válida' })
  fechaCobro?: string;

  @ApiPropertyOptional({ example: 'Cobrada por transferencia.' })
  @IsOptional()
  @IsString()
  notas?: string;
}
