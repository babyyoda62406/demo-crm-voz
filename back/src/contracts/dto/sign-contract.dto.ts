import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignContractDto {
  @ApiProperty({
    example: 'Tomás Olivares Rey',
    description: 'Nombre completo con el que el firmante acepta el documento',
  })
  @IsString()
  @IsNotEmpty({ message: 'Indica tu nombre y apellidos para firmar' })
  @MinLength(3, { message: 'El nombre del firmante es demasiado corto' })
  @MaxLength(120)
  firmanteNombre: string;
}
