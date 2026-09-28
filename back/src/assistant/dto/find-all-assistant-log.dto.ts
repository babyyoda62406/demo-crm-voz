import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AssistantInputType } from '../enums/assistant-input-type.enum';

/**
 * Convierte el booleano de un query string en `boolean` de verdad.
 *
 * `@Type(() => Boolean)` no sirve aquí: `Boolean('false')` es `true`, así que
 * cualquier filtro negativo llegaba invertido.
 */
const aBooleano = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

/** Filtro del historial de órdenes del asistente. */
export class FindAllAssistantLogDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AssistantInputType })
  @IsEnum(AssistantInputType)
  @IsOptional()
  inputType?: AssistantInputType;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtra por órdenes completadas con éxito.',
  })
  @IsBoolean()
  @Transform(aBooleano)
  @IsOptional()
  correcto?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'Filtra por órdenes que fallaron (`true`) o que no fallaron (`false`).',
  })
  @IsBoolean()
  @Transform(aBooleano)
  @IsOptional()
  conError?: boolean;
}
