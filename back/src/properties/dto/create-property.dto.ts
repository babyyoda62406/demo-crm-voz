import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyType } from '../enums/property-type.enum';
import { PropertyStatus } from '../enums/property-status.enum';
import { PropertyZone } from '../enums/property-zone.enum';

export class CreatePropertyDto {
  @ApiPropertyOptional({
    example: 'INM-0001',
    description: 'Referencia interna. Si se omite, se genera automáticamente.',
  })
  @IsOptional()
  @IsString()
  referencia?: string;

  @ApiProperty({ example: 'Piso reformado junto al centro' })
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.PISO })
  @IsEnum(PropertyType)
  tipo: PropertyType;

  @ApiProperty({ example: 'Calle del Norte, 24, 3º 1ª' })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({ enum: PropertyZone, example: PropertyZone.ALTABRIA })
  @IsEnum(PropertyZone)
  zona: PropertyZone;

  @ApiPropertyOptional({ example: 'Altabria' })
  @IsOptional()
  @IsString()
  poblacion?: string;

  @ApiPropertyOptional({ example: 'Nortia' })
  @IsOptional()
  @IsString()
  provincia?: string;

  @ApiPropertyOptional({ example: '00110' })
  @IsOptional()
  @IsString()
  codigoPostal?: string;

  @ApiProperty({ example: 165000, description: 'Precio en euros' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiPropertyOptional({ example: 82, description: 'Superficie en m²' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  superficie?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  habitaciones?: number;

  @ApiPropertyOptional({ enum: PropertyStatus, example: PropertyStatus.DISPONIBLE })
  @IsOptional()
  @IsEnum(PropertyStatus)
  estado?: PropertyStatus;

  @ApiPropertyOptional({ example: 'Finca de 1975 con ascensor, muy luminoso.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Ascensor', 'Terraza', 'Aire acondicionado'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caracteristicas?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['/api/properties/photos/1766249442120-u1nd5.jpg'],
    description: 'URLs relativas devueltas por POST /api/properties/photos',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotos?: string[];

  @ApiPropertyOptional({ example: 6.4, description: 'Rentabilidad bruta anual en %' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  rentabilidadEstimada?: number;

  @ApiPropertyOptional({ example: 3, description: 'Cliente propietario o inversor vinculado' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientId?: number;

  @ApiPropertyOptional({ example: 'La propiedad acepta arras en 15 días.' })
  @IsOptional()
  @IsString()
  notas?: string;
}
