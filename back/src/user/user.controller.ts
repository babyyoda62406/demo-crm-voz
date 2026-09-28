import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindAllUserDto } from './dto/find-all-user.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { Flag } from '../common/enums/flag.enum';

@ApiTags('Usuarios')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_USER)
  @ApiOperation({ summary: 'Crear un usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado correctamente' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return {
      message: 'Usuario creado correctamente',
      flag: Flag.USER_CREATED,
      data: user,
    };
  }

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_USER)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiResponse({ status: 200, description: 'Usuarios recuperados correctamente' })
  async findAll(@Query() dto: FindAllUserDto) {
    return await this.userService.findAll(dto);
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_USER)
  @ApiOperation({ summary: 'Obtener un usuario por id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario recuperado correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.findOne(id);
    return {
      message: 'Usuario recuperado correctamente',
      flag: Flag.SUCCESS,
      data: user,
    };
  }

  @Patch(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_USER)
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    return {
      message: 'Usuario actualizado correctamente',
      flag: Flag.UPDATED,
      data: user,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar un usuario (borrado lógico)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado correctamente' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.remove(id);
    return {
      message: 'Usuario desactivado correctamente',
      flag: Flag.DELETED,
    };
  }

  @Delete(':id/hard')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.HARD_DELETE_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un usuario definitivamente' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado definitivamente' })
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    await this.userService.hardDelete(id);
    return {
      message: 'Usuario eliminado definitivamente',
      flag: Flag.DELETED,
    };
  }

  @Patch(':id/restore')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.RESTORE_USER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restaurar un usuario desactivado' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario restaurado correctamente' })
  async restore(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.restore(id);
    return {
      message: 'Usuario restaurado correctamente',
      flag: Flag.UPDATED,
      data: user,
    };
  }
}
