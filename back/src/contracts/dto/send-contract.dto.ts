import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SendContractDto {
  @ApiPropertyOptional({
    example: 'administracion@example.com',
    description: 'Destinatario del enlace de firma',
  })
  @IsOptional()
  @IsEmail({}, { message: 'El correo del destinatario no es válido' })
  destinatarioEmail?: string;

  @ApiPropertyOptional({ example: 'Te envío el contrato para firma.' })
  @IsOptional()
  @IsString()
  mensaje?: string;
}
