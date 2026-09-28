import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ItPrivileges } from '../../auth/interfaces/it-privileges.interface';

export class CreateUserDto {
  @ApiProperty({ example: 'gestor@crmia.local' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'clave1234' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'García' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '600123456' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ enum: ItPrivileges, isArray: true })
  @IsArray()
  @IsOptional()
  privileges?: ItPrivileges[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rolId?: number;
}
