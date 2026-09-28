import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PropertyType } from '../enums/property-type.enum';
import { PropertyStatus } from '../enums/property-status.enum';
import { PropertyZone } from '../enums/property-zone.enum';

export class FindAllPropertyDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'ático',
    description: 'Texto libre: busca en referencia, título, dirección y población',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PropertyZone })
  @IsOptional()
  @IsEnum(PropertyZone)
  zona?: PropertyZone;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  estado?: PropertyStatus;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  tipo?: PropertyType;

  @ApiPropertyOptional({ example: 80000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioMin?: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precioMax?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  habitacionesMin?: number;

  @ApiPropertyOptional({ example: 5, description: 'Cliente vinculado al inmueble' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientId?: number;
}
