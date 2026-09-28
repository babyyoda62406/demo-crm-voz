import { IsOptional, IsInt, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Metadatos que acompanan al binario en la subida multipart.
 * Todos son opcionales: un fichero puede vivir en la raiz del Drive.
 */
export class CreateFileDocDto {
  @ApiPropertyOptional({ description: 'Carpeta destino' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number;

  @ApiPropertyOptional({ description: 'Cliente vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ description: 'Inmueble vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propiedadId?: number;

  @ApiPropertyOptional({ description: 'Nombre visible. Por defecto, el del fichero subido' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;
}
