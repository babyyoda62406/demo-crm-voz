import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessLine,
  ClientType,
  InterestZone,
  OperationType,
} from '../enums';

export class CreateClientDto {
  @ApiProperty({ example: 'Marta' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional({ example: 'Ferrer Blanch' })
  @IsString()
  @IsOptional()
  apellidos?: string;

  @ApiPropertyOptional({ example: 'marta.bermejo@example.com' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '600123456' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: '00000001R', description: 'NIF / CIF / NIE' })
  @IsString()
  @IsOptional()
  documento?: string;

  @ApiPropertyOptional({ enum: ClientType, example: ClientType.INVERSOR })
  @IsEnum(ClientType, {
    message: 'El tipo debe ser inversor, empresa o particular',
  })
  @IsOptional()
  tipo?: ClientType;

  @ApiPropertyOptional({ enum: BusinessLine, example: BusinessLine.PSI })
  @IsEnum(BusinessLine, {
    message: 'La línea de negocio debe ser psi, alquiler_empresas o reformas',
  })
  @IsOptional()
  lineaNegocio?: BusinessLine;

  @ApiPropertyOptional({
    example: 'lead',
    description:
      'Etapa del pipeline. Si se omite se usa la primera etapa de la línea de negocio.',
  })
  @IsString()
  @IsOptional()
  etapa?: string;

  @ApiPropertyOptional({ example: 120000 })
  @IsNumber({}, { message: 'El presupuesto mínimo debe ser un número' })
  @Min(0, { message: 'El presupuesto mínimo no puede ser negativo' })
  @Type(() => Number)
  @IsOptional()
  presupuestoMin?: number;

  @ApiPropertyOptional({ example: 180000 })
  @IsNumber({}, { message: 'El presupuesto máximo debe ser un número' })
  @Min(0, { message: 'El presupuesto máximo no puede ser negativo' })
  @Type(() => Number)
  @IsOptional()
  presupuestoMax?: number;

  @ApiPropertyOptional({
    enum: InterestZone,
    isArray: true,
    example: [InterestZone.ALTABRIA, InterestZone.VALDEMOR],
  })
  @IsArray()
  @IsEnum(InterestZone, {
    each: true,
    message: 'Alguna zona de interés no está entre las zonas admitidas',
  })
  @IsOptional()
  zonasInteres?: InterestZone[];

  @ApiPropertyOptional({
    enum: OperationType,
    example: OperationType.COMPRA_INVERSION,
  })
  @IsEnum(OperationType, { message: 'El tipo de operación no es válido' })
  @IsOptional()
  tipoOperacion?: OperationType;

  @ApiPropertyOptional({ example: 'Portal inmobiliario' })
  @IsString()
  @IsOptional()
  origen?: string;

  @ApiPropertyOptional({ example: 'Busca rentabilidad superior al 7%.' })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiPropertyOptional({ example: 1, description: 'Usuario responsable' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  responsableId?: number;
}
