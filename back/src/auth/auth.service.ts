import {
  Injectable,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ItJwtPayload } from './interfaces/it-jwt-payload.interface';
import { Flag } from '../common/enums/flag.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { mergePrivileges } from '../common/helpers/merge-privileges.helper';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userDAO: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /** Autentica al usuario y devuelve el JWT que viaja en la cabecera `token`. */
  async login(loginDto: LoginDto) {
    const user = await this.userDAO.findOne({
      where: { email: loginDto.email },
      relations: ['rol'],
    });

    if (!user) {
      throw new HttpException(
        {
          message: 'Credenciales incorrectas',
          flag: Flag.INVALID_CREDENTIALS,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password || '',
    );

    if (!isPasswordValid) {
      throw new HttpException(
        {
          message: 'Credenciales incorrectas',
          flag: Flag.PASSWORD_MISMATCH,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new HttpException(
        {
          message: 'El usuario no está activo',
          flag: Flag.UNAUTHORIZED,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const payload: ItJwtPayload = {
      id: user.id,
      email: user.email,
      privileges: mergePrivileges(user.privileges, user.rol?.privileges),
    };

    const token = this.jwtService.sign(payload);

    this.logger.log(`Login correcto: ${user.email}`);

    return {
      message: 'Sesión iniciada correctamente',
      flag: Flag.LOGIN_SUCCESS,
      token,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        rol: user.rol ? { id: user.rol.id, name: user.rol.name } : null,
        privileges: payload.privileges,
      },
    };
  }

  /** Revalida el token y devuelve el perfil vigente del usuario. */
  async profile(payload: ItJwtPayload) {
    const user = await this.userDAO.findOne({
      where: { id: payload.id },
      relations: ['rol'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        message: 'Token inválido',
        flag: Flag.UNAUTHORIZED,
      });
    }

    return {
      message: 'Perfil recuperado correctamente',
      flag: Flag.SUCCESS,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        rol: user.rol ? { id: user.rol.id, name: user.rol.name } : null,
        privileges: mergePrivileges(user.privileges, user.rol?.privileges),
      },
    };
  }

  /** Cambia la contraseña del usuario autenticado. */
  async changePassword(payload: ItJwtPayload, dto: ChangePasswordDto) {
    const user = await this.userDAO.findOne({ where: { id: payload.id } });

    if (!user) {
      throw new HttpException(
        {
          message: 'Usuario no encontrado',
          flag: Flag.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password || '',
    );

    if (!isPasswordValid) {
      throw new HttpException(
        {
          message: 'La contraseña actual no es correcta',
          flag: Flag.PASSWORD_MISMATCH,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userDAO.save(user);

    this.logger.log(`Contraseña actualizada: ${user.email}`);

    return {
      message: 'Contraseña actualizada correctamente',
      flag: Flag.UPDATED,
    };
  }

  /** Valida el payload de un JWT contra el estado actual del usuario. */
  async validateUser(payload: ItJwtPayload): Promise<ItJwtPayload> {
    const user = await this.userDAO.findOne({
      where: { id: payload.id },
      relations: ['rol'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException({
        message: 'Token inválido',
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
