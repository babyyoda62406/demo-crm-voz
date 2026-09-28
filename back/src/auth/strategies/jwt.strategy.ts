import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getEnvConfig } from '../../env/envs';
import { ItJwtPayload } from '../interfaces/it-jwt-payload.interface';
import { User } from '../../user/entities/user.entity';
import { Flag } from '../../common/enums/flag.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { mergePrivileges } from '../../common/helpers/merge-privileges.helper';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userDAO: Repository<User>,
  ) {
    const env = getEnvConfig();
    super({
      jwtFromRequest: ExtractJwt.fromHeader('token'),
      ignoreExpiration: false,
      secretOrKey: env.JWTSECRET,
    });
  }

  async validate(payload: ItJwtPayload): Promise<ItJwtPayload> {
    const user = await this.userDAO.findOne({
      where: { id: payload.id },
      relations: ['rol'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        message: 'Token invalido',
        flag: Flag.UNAUTHORIZED,
      });
    }

    return {
      id: user.id,
      email: user.email,
      privileges: mergePrivileges(user.privileges, user.rol?.privileges),
    };
  }
}
