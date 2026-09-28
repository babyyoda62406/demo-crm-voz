import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessLine } from '../enums';

/** Cuerpo de `PATCH /clients/:id/stage` (arrastre de tarjeta en el kanban). */
export class MoveStageDto {
  @ApiProperty({
    example: 'busqueda',
    description:
      'Etapa destino. Se normaliza (tildes, mayúsculas y sinónimos) antes de validarla.',
  })
  @IsString()
  @IsNotEmpty({ message: 'La etapa destino es obligatoria' })
  etapa: string;

  @ApiPropertyOptional({
    enum: BusinessLine,
    description:
      'Cambio simultáneo de línea de negocio. La etapa debe pertenecer a esta línea.',
  })
  @IsEnum(BusinessLine, {
    message: 'La línea de negocio debe ser psi, alquiler_empresas o reformas',
  })
  @IsOptional()
  lineaNegocio?: BusinessLine;

  @ApiPropertyOptional({
    example: 'El cliente acepta el presupuesto y pasamos a obra.',
    description: 'Comentario que se guarda junto al apunte del historial.',
  })
  @IsString()
  @IsOptional()
  comentario?: string;
}
