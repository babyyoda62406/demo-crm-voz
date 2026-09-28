import { PaginationDto } from '../../common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindAllRolDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'Gestor' })
  @IsOptional()
  @IsString()
  name?: string;
}
