import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceLineDto } from './invoice-line.dto';
import { ImporteEntrante } from './importe-entrante.decorator';

/**
 * Alta de factura. La base imponible, la cuota de IVA y el total NO se reciben:
 * los calcula el servicio a partir de las líneas y del tipo de IVA.
 */
export class CreateInvoiceDto {
  @ApiProperty({ example: 12, description: 'Identificador del cliente facturado' })
  @Type(() => Number)
  @IsInt({ message: 'El cliente es obligatorio' })
  clienteId: number;

  @ApiProperty({ example: 'Promociones Orión, S.L.' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  clienteNombre: string;

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

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contratoId?: number;

  @ApiPropertyOptional({ example: 'CTR-2026-0007' })
  @IsOptional()
  @IsString()
  contratoReferencia?: string;

  @ApiProperty({ type: [InvoiceLineDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos una línea' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lineas: InvoiceLineDto[];

  @ApiPropertyOptional({ example: 21, default: 21 })
  @IsOptional()
  @ImporteEntrante()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El tipo de IVA debe ser un número' })
  @Min(0, { message: 'El tipo de IVA no puede ser negativo' })
  @Max(100, { message: 'El tipo de IVA no puede superar el 100 %' })
  tipoIva?: number;

  @ApiPropertyOptional({ example: '2026-08-26', description: 'Por defecto, hoy' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de emisión no es válida' })
  fechaEmision?: string;

  @ApiPropertyOptional({ example: 'Pago a 30 días por transferencia.' })
  @IsOptional()
  @IsString()
  notas?: string;
}
