import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateNotificationDto } from './create-notification.dto';

/** Actualizacion parcial de una alerta (basicamente, marcarla leida). */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'El indicador de lectura no es válido' })
  leida?: boolean;
}
