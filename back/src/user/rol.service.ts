import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';
import { User } from './entities/user.entity';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { FindAllRolDto } from './dto/find-all-rol.dto';
import { DEFAULT_ROLES } from './seed/default-roles.seed';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { Flag } from '../common/enums/flag.enum';

@Injectable()
export class RolService {
  private readonly logger = new Logger(RolService.name);

  constructor(
    @InjectRepository(Rol)
    private readonly rolDAO: Repository<Rol>,
    @InjectRepository(User)
    private readonly userDAO: Repository<User>,
  ) {}

  async create(createRolDto: CreateRolDto): Promise<Rol> {
    const existingRol = await this.rolDAO.findOne({
      where: { name: createRolDto.name },
    });

    if (existingRol) {
      throw new HttpException(
        {
          message: 'El rol ya existe',
          flag: Flag.CONFLICT,
        },
        HttpStatus.CONFLICT,
      );
    }

    const rol = this.rolDAO.create({
      ...createRolDto,
      privileges: createRolDto.privileges || [],
    });

    const savedRol = await this.rolDAO.save(rol);
    this.logger.log(`Rol creado: ${savedRol.name}`);

    return savedRol;
  }

  async findAll(dto: FindAllRolDto): Promise<ItFindAllResponse<Rol>> {
    const { page = 1, size = 10, name } = dto;

    const where: any = {};
    if (name) where.name = ILike(`%${name}%`);

    const total = await this.rolDAO.count({ where });
    const data = await this.rolDAO.find({
      where,
      skip: (page - 1) * size,
      take: size,
      order: { id: 'asc' },
    });

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

  async findOne(id: number): Promise<Rol> {
    const rol = await this.rolDAO.findOne({ where: { id } });

    if (!rol) {
      throw new HttpException(
        {
          message: 'Rol no encontrado',
          flag: Flag.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return rol;
  }

  async update(id: number, updateRolDto: UpdateRolDto): Promise<Rol> {
    const rol = await this.findOne(id);

    if (updateRolDto.name && updateRolDto.name !== rol.name) {
      const existingRol = await this.rolDAO.findOne({
        where: { name: updateRolDto.name },
      });

      if (existingRol) {
        throw new HttpException(
          {
            message: 'Ya existe un rol con ese nombre',
            flag: Flag.CONFLICT,
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    Object.assign(rol, updateRolDto);
    const updatedRol = await this.rolDAO.save(rol);
    this.logger.log(`Rol actualizado: ${updatedRol.name}`);

    return updatedRol;
  }

  async remove(id: number): Promise<void> {
    const rol = await this.findOne(id);

    const usersWithRol = await this.userDAO.count({ where: { rolId: id } });

    if (usersWithRol > 0) {
      throw new HttpException(
        {
          message: 'No se puede eliminar un rol con usuarios asignados',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    await this.rolDAO.remove(rol);
    this.logger.log(`Rol eliminado: ${rol.name}`);
  }

  /**
   * Crea los roles semilla de CRMIA que aún no existan.
   * Es idempotente: no sobrescribe los privilegios de un rol ya creado.
   */
  async seedDefaultRoles(): Promise<void> {
    for (const seed of DEFAULT_ROLES) {
      const exists = await this.rolDAO.findOne({ where: { name: seed.name } });
      if (exists) continue;

      const rol = this.rolDAO.create({
        name: seed.name,
        description: seed.description,
        privileges: seed.privileges,
      });
      await this.rolDAO.save(rol);
      this.logger.log(`Rol semilla creado: ${seed.name}`);
    }
  }
}
