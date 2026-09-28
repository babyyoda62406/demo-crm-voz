import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '../enums/property-type.enum';
import { PropertyZone } from '../enums/property-zone.enum';

/** Convierte `?zonas=altabria&zonas=serranova` y `?zonas=altabria,serranova` en un array. */
const toArray = ({ value }: { value: unknown }): unknown[] => {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

/**
 * Ajustes opcionales del cruce de coincidencias. Todo lo que se envíe aquí
 * tiene prioridad sobre el perfil inversor almacenado en la ficha del cliente:
 * permite simular criterios en la demo sin tocar el cliente.
 */
export class MatchPropertiesDto {
  @ApiPropertyOptional({ example: 90000, description: 'Presupuesto mínimo en euros' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  presupuestoMin?: number;

  @ApiPropertyOptional({ example: 200000, description: 'Presupuesto máximo en euros' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  presupuestoMax?: number;

  @ApiPropertyOptional({ enum: PropertyZone, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(PropertyZone, { each: true })
  zonas?: PropertyZone[];

  @ApiPropertyOptional({ enum: PropertyType, isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  tipos?: PropertyType[];

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  habitacionesMin?: number;

  @ApiPropertyOptional({ example: 70, description: 'Superficie mínima en m²' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  superficieMin?: number;

  @ApiPropertyOptional({ example: 5.5, description: 'Rentabilidad mínima exigida en %' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rentabilidadMin?: number;

  @ApiPropertyOptional({ example: 12, description: 'Número máximo de coincidencias' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Incluir también inmuebles no comercializables (alquilados, traspasados...)',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  incluirNoDisponibles?: boolean;
}
