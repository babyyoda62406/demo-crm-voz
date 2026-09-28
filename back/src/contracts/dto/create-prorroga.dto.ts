import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProrrogaDto {
  @ApiPropertyOptional({
    description:
      'Valores que sobrescriben los precargados desde el contrato original',
    example: { duracionProrroga: 'seis meses', fechaFinProrroga: '28/02/2027' },
  })
  @IsOptional()
  @IsObject()
  datos?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Prórroga alquiler C/ Mar 22' })
  @IsOptional()
  @IsString()
  titulo?: string;
}
