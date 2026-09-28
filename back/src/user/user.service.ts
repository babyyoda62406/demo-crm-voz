import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Rol } from './entities/rol.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUserDto } from './dto/find-all-user.dto';
import { ADMIN_ROL_NAME } from './seed/default-roles.seed';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { Flag } from '../common/enums/flag.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { getEnvConfig } from '../env/envs';

/** Email fijo del administrador semilla de CRMIA. */
export const ADMIN_EMAIL = 'admin@crmia.local';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userDAO: Repository<User>,
    @InjectRepository(Rol)
    private readonly rolDAO: Repository<Rol>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userDAO.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new HttpException(
        {
          message: 'Ya existe un usuario con ese correo',
          flag: Flag.CONFLICT,
        },
        HttpStatus.CONFLICT,
      );
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.userDAO.create({
      ...createUserDto,
      password: hashedPassword,
      privileges: createUserDto.privileges || [],
      status: createUserDto.status || UserStatus.ACTIVE,
    });

    const savedUser = await this.userDAO.save(user);
    this.logger.log(`Usuario creado: ${savedUser.email}`);

    delete savedUser.password;
    return savedUser;
  }

  async findAll(dto: FindAllUserDto): Promise<ItFindAllResponse<User>> {
    const { page = 1, size = 10, email, search, status, rolId } = dto;

    const base: FindOptionsWhere<User> = {};
    if (email) base.email = ILike(`%${email}%`);
    if (status) base.status = status;
    if (rolId) base.rolId = rolId;

    // Con `search` se busca en nombre, apellidos y correo (OR de condiciones).
    const where: FindOptionsWhere<User> | FindOptionsWhere<User>[] = search
      ? [
          { ...base, name: ILike(`%${search}%`) },
          { ...base, lastName: ILike(`%${search}%`) },
          { ...base, email: ILike(`%${search}%`) },
        ]
      : base;

    const total = await this.userDAO.count({ where });
    const data = await this.userDAO.find({
      where,
      skip: (page - 1) * size,
      take: size,
      relations: ['rol'],
      order: { id: 'asc' },
    });

    data.forEach((user) => delete user.password);

    return {
      data,
      metadata: {
        records: total,
        frame: page,
        frameSize: size,
        lastFrame: Math.ceil(total / size) || 1,
      },
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userDAO.findOne({
      where: { id },
      relations: ['rol'],
    });

    if (!user) {
      throw new HttpException(
        {
          message: 'Usuario no encontrado',
          flag: Flag.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    delete user.password;
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userDAO.findOne({
      where: { id },
      relations: ['rol'],
    });

    if (!user) {
      throw new HttpException(
        {
          message: 'Usuario no encontrado',
          flag: Flag.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const duplicated = await this.userDAO.findOne({
        where: { email: updateUserDto.email, id: Not(id) },
      });

      if (duplicated) {
        throw new HttpException(
          {
            message: 'Ya existe un usuario con ese correo',
            flag: Flag.CONFLICT,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userDAO.save(user);
    this.logger.log(`Usuario actualizado: ${updatedUser.email}`);

    delete updatedUser.password;
    return updatedUser;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userDAO.update(id, { status: UserStatus.DELETED });
    this.logger.log(`Usuario desactivado: ${user.email}`);
  }

  async restore(id: number): Promise<User> {
    const user = await this.findOne(id);
    await this.userDAO.update(id, { status: UserStatus.ACTIVE });
    this.logger.log(`Usuario restaurado: ${user.email}`);
    return this.findOne(id);
  }

  async hardDelete(id: number): Promise<void> {
    const user = await this.userDAO.findOne({ where: { id } });

    if (!user) {
      throw new HttpException(
        {
          message: 'Usuario no encontrado',
          flag: Flag.USER_NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.userDAO.remove(user);
    this.logger.log(`Usuario eliminado permanentemente: ${user.email}`);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userDAO.findOne({
      where: { email },
      relations: ['rol'],
    });
  }

  /**
   * Crea el administrador semilla en el primer arranque.
   * Idempotente: si `admin@crmia.local` ya existe, no hace nada.
   * La contraseña se toma de la variable de entorno `ADMIN_PASSWORD`.
   */
  async autoCreateAdmin(): Promise<void> {
    const existingAdmin = await this.userDAO.findOne({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) return;

    const env = getEnvConfig();
    const adminRol = await this.rolDAO.findOne({
      where: { name: ADMIN_ROL_NAME },
    });

    const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    const admin = this.userDAO.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: 'Administrador',
      lastName: 'CRMIA',
      status: UserStatus.ACTIVE,
      privileges: [ItPrivileges.ALL_PRIVILEGES],
      rolId: adminRol?.id ?? null,
    });

    await this.userDAO.save(admin);
    this.logger.log(`Administrador semilla creado: ${ADMIN_EMAIL}`);
  }
}
