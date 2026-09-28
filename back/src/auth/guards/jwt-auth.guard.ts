import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guardia de JWT. Solo delega en Passport; existe como clase propia para poder
 * referenciarla desde `@Auth(...)` sin repetir la cadena `'jwt'` por todo el
 * codigo y para tener un sitio donde enganchar logica si algun dia hace falta.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
