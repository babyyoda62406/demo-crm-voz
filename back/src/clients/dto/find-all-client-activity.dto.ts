import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ClientActivityType } from '../enums';

export class FindAllClientActivityDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ClientActivityType })
  @IsEnum(ClientActivityType)
  @IsOptional()
  tipo?: ClientActivityType;
}
