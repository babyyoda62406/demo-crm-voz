import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UserPrivilegesGuard } from '../guards/user-privileges.guard';
import { PrivilegesProtected } from './privileges-protected.decorator';
import { ItPrivileges } from '../interfaces/it-privileges.interface';

/**
 * Decorador combinado de proteccion de endpoints.
 * Exige JWT valido (cabecera `token`) y al menos UNO de los privilegios dados.
 *
 * @example
 * `@Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT)`
 */
export function Auth(...privileges: ItPrivileges[]) {
  return applyDecorators(
    PrivilegesProtected(...privileges),
    UseGuards(JwtAuthGuard, UserPrivilegesGuard),
    ApiBearerAuth('token'),
    ApiUnauthorizedResponse({ description: 'No autorizado' }),
  );
}
