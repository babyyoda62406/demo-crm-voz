import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Orden enviada al asistente.
 *
 * El endpoint acepta dos formas excluyentes:
 * - `multipart/form-data` con el fichero `audio` (orden dictada).
 * - `application/json` con el campo `texto` (orden escrita).
 */
export class CreateAssistantCommandDto {
  @ApiPropertyOptional({
    example: 'Da de alta a Marta Bermejo, teléfono 600123456, línea PSI.',
    description:
      'Orden escrita. Se omite cuando la orden llega como audio en el campo `audio`.',
  })
  @IsString()
  @MinLength(2, { message: 'La orden es demasiado corta' })
  @MaxLength(2000, { message: 'La orden es demasiado larga' })
  @IsOptional()
  texto?: string;
}
