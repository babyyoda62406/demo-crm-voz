import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ItJwtPayload } from '../interfaces/it-jwt-payload.interface';

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ItJwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: ItJwtPayload }>();
    return request.user;
  },
);
