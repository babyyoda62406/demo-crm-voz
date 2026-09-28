import { IsOptional, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Alta (idempotente) de la carpeta raiz de un cliente o de un inmueble.
 * La llaman los dominios `clients/` y `properties/` al vincular documentacion.
 */
export class EnsureRootFolderDto {
  @ApiPropertyOptional({ description: 'Cliente para el que se crea la carpeta raiz' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ description: 'Inmueble para el que se crea la carpeta raiz' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propiedadId?: number;

  @ApiPropertyOptional({
    description: 'Nombre de la carpeta. Por defecto `Cliente #id` o `Inmueble #id`',
  })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  nombre?: string;
}
