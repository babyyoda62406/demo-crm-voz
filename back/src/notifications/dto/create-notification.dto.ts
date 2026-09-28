import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationPriority,
  NotificationType,
} from '../enums/notification-type.enum';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';

/** Alta manual de una alerta (la usan el asistente y los modulos de dominio). */
export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationType, example: NotificationType.RECORDATORIO })
  @IsEnum(NotificationType, { message: 'El tipo de alerta no es válido' })
  tipo: NotificationType;

  @ApiProperty({ example: 'Aviso de prórroga' })
  @IsString({ message: 'El título es obligatorio' })
  @MaxLength(160, { message: 'El título no puede superar los 160 caracteres' })
  titulo: string;

  @ApiProperty({
    example:
      'El contrato CT-2026-0001 de Construcciones Orión Norte vence en 18 días.',
  })
  @IsString({ message: 'El mensaje es obligatorio' })
  mensaje: string;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    example: NotificationPriority.MEDIA,
  })
  @IsOptional()
  @IsEnum(NotificationPriority, { message: 'La prioridad no es válida' })
  prioridad?: NotificationPriority;

  @ApiPropertyOptional({
    example: 1,
    description: 'Destinatario. Si se omite, la alerta es general del despacho.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El identificador de usuario no es válido' })
  usuarioId?: number;

  @ApiPropertyOptional({ enum: NotificationEntityType })
  @IsOptional()
  @IsEnum(NotificationEntityType, { message: 'La entidad relacionada no es válida' })
  entidadTipo?: NotificationEntityType;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El identificador de la entidad no es válido' })
  entidadId?: number;

  @ApiPropertyOptional({ example: 'CT-2026-0001' })
  @IsOptional()
  @IsString()
  entidadNombre?: string;

  @ApiPropertyOptional({ example: '/contratos' })
  @IsOptional()
  @IsString()
  enlace?: string;

  @ApiPropertyOptional({
    example: 'aviso_prorroga:contrato:12',
    description:
      'Huella de deduplicación: no se crea otra alerta sin leer con la misma clave.',
  })
  @IsOptional()
  @IsString()
  claveRegla?: string;
}
