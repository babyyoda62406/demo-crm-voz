import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotificationType } from '../enums/notification-type.enum';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';

/** Filtros del listado de alertas. */
export class FindAllNotificationDto extends PaginationDto {
  @ApiPropertyOptional({
    example: false,
    description: 'true: solo leídas. false: solo sin leer. Omitido: todas.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1')
      return true;
    if (value === false || value === 'false' || value === 0 || value === '0')
      return false;
    return value;
  })
  @IsBoolean({ message: 'El filtro de lectura no es válido' })
  leida?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType, { message: 'El tipo de alerta no es válido' })
  tipo?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationEntityType })
  @IsOptional()
  @IsEnum(NotificationEntityType, {
    message: 'La entidad relacionada no es válida',
  })
  entidadTipo?: NotificationEntityType;
}
