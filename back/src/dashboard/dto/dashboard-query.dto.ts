import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Ventana temporal de los vencimientos proximos. */
export class DeadlinesQueryDto {
  @ApiPropertyOptional({
    example: 30,
    minimum: 1,
    maximum: 365,
    description: 'Días hacia delante que se consideran. Por defecto 30.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El número de días no es válido' })
  @Min(1, { message: 'El número de días debe ser al menos 1' })
  @Max(365, { message: 'El número de días no puede superar 365' })
  dias?: number = 30;
}

/** Tope de elementos devueltos por los listados del cuadro de mando. */
export class LimitQueryDto {
  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 50,
    description: 'Número máximo de elementos. Por defecto 10.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite no es válido' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(50, { message: 'El límite no puede superar 50' })
  limite?: number = 10;
}
