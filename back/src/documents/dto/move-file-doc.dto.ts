import { IsOptional, IsInt, Min, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Movimiento de un elemento del Drive.
 * Omitir `folderId` (o `parentId` en carpetas) significa "llevalo a la raiz".
 */
export class MoveFileDocDto {
  @ApiPropertyOptional({ description: 'Carpeta destino. Vacio = raiz del Drive' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number;
}

export class MoveFolderDto {
  @ApiPropertyOptional({ description: 'Carpeta padre destino. Vacio = raiz del Drive' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;
}

/**
 * Movimiento en masa de documentos (seleccion multiple del Drive).
 * `folderId` a null o ausente significa "llevalos a la raiz".
 */
export class MoveBulkFileDocDto {
  @ApiProperty({
    type: [Number],
    description: 'Identificadores de los documentos a mover',
    example: [12, 13, 14],
  })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids: number[];

  @ApiPropertyOptional({
    description: 'Carpeta destino. Nulo o vacio = raiz del Drive',
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  folderId?: number | null;
}
