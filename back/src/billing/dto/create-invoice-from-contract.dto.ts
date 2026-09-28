import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ImporteEntrante } from './importe-entrante.decorator';

/**
 * Generación de una factura a partir de un contrato.
 *
 * El servicio intenta precargar concepto, importe y datos del cliente leyendo
 * el contrato indicado; todo lo que llegue en este DTO tiene prioridad sobre lo
 * leído, de modo que la persona usuaria pueda ajustar el importe antes de emitir.
 */
export class CreateInvoiceFromContractDto {
  @ApiProperty({ example: 7 })
  @Type(() => Number)
  @IsInt({ message: 'El contrato es obligatorio' })
  contratoId: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clienteId?: number;

  @ApiPropertyOptional({ example: 'Promociones Orión, S.L.' })
  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @ApiPropertyOptional({ example: 'B12345678' })
  @IsOptional()
  @IsString()
  clienteDocumento?: string;

  @ApiPropertyOptional({ example: 'Avenida del Puerto 45, 00110 Altabria' })
  @IsOptional()
  @IsString()
  clienteDireccion?: string;

  @ApiPropertyOptional({ example: 'administracion@promocioneslevante.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo del cliente no es válido' })
  clienteEmail?: string;

  @ApiPropertyOptional({ example: 'CTR-2026-0007' })
  @IsOptional()
  @IsString()
  contratoReferencia?: string;

  @ApiPropertyOptional({ example: 'Honorarios del mandato de búsqueda PSI' })
  @IsOptional()
  @IsString()
  concepto?: string;

  @ApiPropertyOptional({
    example: 3500,
    description: 'Importe sin IVA. Admite «1.234,56» y «1234.56»',
  })
  @IsOptional()
  @ImporteEntrante()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El importe debe ser un número' })
  @Min(0, { message: 'El importe no puede ser negativo' })
  importe?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @ImporteEntrante()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La cantidad debe ser un número' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad?: number;

  @ApiPropertyOptional({ example: 21, default: 21 })
  @IsOptional()
  @ImporteEntrante()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El tipo de IVA debe ser un número' })
  @Min(0, { message: 'El tipo de IVA no puede ser negativo' })
  @Max(100, { message: 'El tipo de IVA no puede superar el 100 %' })
  tipoIva?: number;

  @ApiPropertyOptional({ example: '2026-08-26' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  fechaEmision?: string;

  @ApiPropertyOptional({ example: 'Factura emitida al firmar el contrato.' })
  @IsOptional()
  @IsString()
  notas?: string;
}
