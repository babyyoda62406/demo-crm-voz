import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  BusinessLine,
  ClientStatus,
  ClientType,
  InterestZone,
  OperationType,
} from '../enums';

export class FindAllClientDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'Marta',
    description: 'Texto libre: busca en nombre, apellidos, email, teléfono y documento',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ClientType })
  @IsEnum(ClientType)
  @IsOptional()
  tipo?: ClientType;

  @ApiPropertyOptional({ enum: BusinessLine })
  @IsEnum(BusinessLine)
  @IsOptional()
  lineaNegocio?: BusinessLine;

  @ApiPropertyOptional({ example: 'busqueda' })
  @IsString()
  @IsOptional()
  etapa?: string;

  @ApiPropertyOptional({
    enum: ClientStatus,
    description: 'Por defecto se listan solo los clientes activos',
  })
  @IsEnum(ClientStatus)
  @IsOptional()
  estado?: ClientStatus;

  @ApiPropertyOptional({ enum: InterestZone })
  @IsEnum(InterestZone)
  @IsOptional()
  zona?: InterestZone;

  @ApiPropertyOptional({ enum: OperationType })
  @IsEnum(OperationType)
  @IsOptional()
  tipoOperacion?: OperationType;

  @ApiPropertyOptional({ example: 100000, description: 'Presupuesto máximo desde' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  presupuestoDesde?: number;

  @ApiPropertyOptional({ example: 250000, description: 'Presupuesto mínimo hasta' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  presupuestoHasta?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  responsableId?: number;
}
