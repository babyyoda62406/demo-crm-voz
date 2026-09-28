import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Opciones de la carga de datos de demostracion. */
export class SeedDemoDto {
  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Si es true, ELIMINA clientes, historial, inmuebles, contratos, facturas y alertas antes de sembrar. No toca usuarios, roles ni plantillas.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1')
      return true;
    if (value === false || value === 'false' || value === 0 || value === '0')
      return false;
    return value;
  })
  @IsBoolean({ message: 'La opción de reinicio no es válida' })
  reiniciar?: boolean = false;
}
