import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FindAllFolderDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por carpeta padre' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;

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
}
