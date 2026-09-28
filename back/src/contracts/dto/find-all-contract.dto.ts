import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ContractState } from '../enums/contract-state.enum';

export class FindAllContractDto extends PaginationDto {
  @ApiPropertyOptional({
    example: 'Delta',
    description: 'Busca en referencia, título, cliente y dirección del inmueble',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ContractState })
  @IsOptional()
  @IsEnum(ContractState)
  estado?: ContractState;

  @ApiPropertyOptional({ example: 'alquiler-temporal' })
  @IsOptional()
  @IsString()
  templateKey?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  clienteId?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  propiedadId?: number;
}
