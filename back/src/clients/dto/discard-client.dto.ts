import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Cuerpo de `PATCH /clients/:id/discard`. El motivo es obligatorio. */
export class DiscardClientDto {
  @ApiProperty({
    example: 'Presupuesto insuficiente para las zonas que le interesan.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del descarte es obligatorio' })
  @MinLength(3, { message: 'El motivo del descarte es demasiado corto' })
  motivoDescarte: string;
}
