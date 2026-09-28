import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Auth } from './decorators/auth.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { ItJwtPayload } from './interfaces/it-jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiResponse({ status: 200, description: 'Sesión iniciada correctamente' })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas' })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Get('profile')
  @Auth()
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil recuperado correctamente' })
  async profile(@GetUser() user: ItJwtPayload) {
    return await this.authService.profile(user);
  }

  @Post('change-password')
  @Auth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la contraseña propia' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada correctamente' })
  async changePassword(
    @GetUser() user: ItJwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(user, dto);
  }
}
