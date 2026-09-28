import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ItPrivileges } from '../interfaces/it-privileges.interface';
import { ItJwtPayload } from '../interfaces/it-jwt-payload.interface';
import { PRIVILEGES_KEY } from '../decorators/privileges-protected.decorator';
import { Flag } from '../../common/enums/flag.enum';

@Injectable()
export class UserPrivilegesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPrivileges = this.reflector.get<ItPrivileges[]>(
      PRIVILEGES_KEY,
      context.getHandler(),
    );

    // `@Auth()` sin privilegios = solo exige estar autenticado.
    if (!requiredPrivileges || requiredPrivileges.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: ItJwtPayload = request.user;

    if (!user) {
      throw new UnauthorizedException({
        message: 'Usuario no autenticado',
        flag: Flag.UNAUTHORIZED,
      });
    }

    const hasAllPrivileges = user.privileges.includes(
      ItPrivileges.ALL_PRIVILEGES,
    );
    const hasRequiredPrivilege = requiredPrivileges.some((privilege) =>
      user.privileges.includes(privilege),
    );

    if (!hasAllPrivileges && !hasRequiredPrivilege) {
      throw new ForbiddenException({
        message: 'Privilegios insuficientes',
        flag: Flag.FORBIDDEN,
      });
    }

    return true;
  }
}
