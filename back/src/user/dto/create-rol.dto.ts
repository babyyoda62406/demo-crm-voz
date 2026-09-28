import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItPrivileges } from '../../auth/interfaces/it-privileges.interface';

export class CreateRolDto {
  @ApiProperty({ example: 'Gestor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Gestión operativa completa del CRM' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ItPrivileges, isArray: true })
  @IsArray()
  @IsOptional()
  privileges?: ItPrivileges[];
}
