import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'admin1234' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'nuevaClave2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
