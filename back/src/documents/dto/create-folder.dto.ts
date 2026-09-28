import { IsString, IsOptional, IsInt, IsNotEmpty, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ example: 'Notas simples', description: 'Nombre de la carpeta' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(180)
  nombre: string;

  @ApiPropertyOptional({ example: 3, description: 'Carpeta padre. Si se omite, cuelga de la raiz' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

  @ApiPropertyOptional({ example: 12, description: 'Cliente vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ example: 8, description: 'Inmueble vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propiedadId?: number;
}
