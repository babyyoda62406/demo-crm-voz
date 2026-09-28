import { IsBooleanString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessLine, ClientType } from '../enums';

/**
 * Campos que acompanan al fichero en `POST /clients/import` (multipart).
 *
 * Al venir de un formulario multipart todos los valores llegan como texto, de
 * ahi `@IsBooleanString` en lugar de `@IsBoolean`.
 */
export class ImportClientsDto {
  @ApiPropertyOptional({
    enum: BusinessLine,
    description:
      'Línea de negocio por defecto para las filas que no la traigan. Por defecto: psi.',
  })
  @IsEnum(BusinessLine, {
    message: 'La línea de negocio debe ser psi, alquiler_empresas o reformas',
  })
  @IsOptional()
  lineaNegocio?: BusinessLine;

  @ApiPropertyOptional({
    enum: ClientType,
    description:
      'Tipo por defecto para las filas que no lo traigan. Por defecto: inversor.',
  })
  @IsEnum(ClientType, {
    message: 'El tipo debe ser inversor, empresa o particular',
  })
  @IsOptional()
  tipo?: ClientType;

  @ApiPropertyOptional({
    example: 'true',
    description:
      'Si es "true", las filas cuyo email ya exista actualizan el cliente en vez de omitirse.',
  })
  @IsBooleanString({ message: 'actualizarExistentes debe ser "true" o "false"' })
  @IsOptional()
  actualizarExistentes?: string;
}
