import { IsOptional, IsInt, IsString, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FindAllFileDocDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Ficheros contenidos en esta carpeta' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por cliente vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por inmueble vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  propiedadId?: number;

  @ApiPropertyOptional({ description: 'Busqueda parcial por nombre' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description:
      'Si es `true`, solo devuelve los ficheros de la raiz (sin carpeta). Se ignora si se envia `folderId`',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  soloRaiz?: boolean;
}
