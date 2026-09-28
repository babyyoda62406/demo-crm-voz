import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({
    example: 'alquiler-temporal',
    description: 'Clave de la plantilla registrada',
  })
  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @ApiPropertyOptional({
    example: 'Alquiler Calle Mayor 22 · Construcciones Orión Norte',
    description: 'Título con el que aparece en el listado',
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  titulo?: string;

  @ApiProperty({
    description: 'Valores de los marcadores de la plantilla',
    example: { diaContrato: '11', mesContrato: 'agosto', anioContrato: '2026' },
  })
  @IsObject()
  datos: Record<string, unknown>;

  @ApiPropertyOptional({ example: 12, description: 'Cliente vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clienteId?: number;

  @ApiPropertyOptional({ example: 'Construcciones Orión Norte, S.L.' })
  @IsOptional()
  @IsString()
  clienteNombre?: string;

  @ApiPropertyOptional({ example: 4, description: 'Inmueble vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  propiedadId?: number;

  @ApiPropertyOptional({ example: 'Calle Mayor 22, 3.º 2.ª, Altabria' })
  @IsOptional()
  @IsString()
  propiedadDireccion?: string;

  @ApiPropertyOptional({ example: 'Pendiente de revisar la fianza' })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiPropertyOptional({
    example: 7,
    description: 'Contrato del que procede (prórrogas y anexos)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  contratoOrigenId?: number;
}
