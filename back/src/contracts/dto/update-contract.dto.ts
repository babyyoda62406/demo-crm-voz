import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';

export class UpdateContractDto extends PartialType(CreateContractDto) {
  @ApiPropertyOptional({
    example: true,
    description:
      'Si es `true` (por defecto) se vuelven a generar el .docx y el .pdf con los datos actualizados',
  })
  @IsOptional()
  @IsBoolean()
  regenerar?: boolean;
}
