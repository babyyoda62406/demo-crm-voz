import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientActivityType } from '../enums';

/** Cuerpo de `POST /clients/:id/activities` (apunte manual del historial). */
export class CreateClientActivityDto {
  @ApiProperty({ enum: ClientActivityType, example: ClientActivityType.LLAMADA })
  @IsEnum(ClientActivityType, { message: 'El tipo de actividad no es válido' })
  tipo: ClientActivityType;

  @ApiProperty({ example: 'Llamada de seguimiento: pide ver el piso el jueves.' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  descripcion: string;

  @ApiPropertyOptional({
    example: '2026-08-20T10:30:00.000Z',
    description: 'Fecha del hecho. Si se omite se usa la fecha actual.',
  })
  @IsDateString({}, { message: 'La fecha no tiene un formato válido' })
  @IsOptional()
  fecha?: string;
}
