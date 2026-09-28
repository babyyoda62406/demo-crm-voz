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
import { RolService } from './rol.service';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';
import { FindAllRolDto } from './dto/find-all-rol.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { Flag } from '../common/enums/flag.enum';

@ApiTags('Roles')
@Controller('rol')
export class RolController {
  constructor(private readonly rolService: RolService) {}

  @Post()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.ADD_ROL)
  @ApiOperation({ summary: 'Crear un rol' })
  @ApiResponse({ status: 201, description: 'Rol creado correctamente' })
  async create(@Body() createRolDto: CreateRolDto) {
    const rol = await this.rolService.create(createRolDto);
    return {
      message: 'Rol creado correctamente',
      flag: Flag.CREATED,
      data: rol,
    };
  }

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_ROL)
  @ApiOperation({ summary: 'Listar roles' })
  @ApiResponse({ status: 200, description: 'Roles recuperados correctamente' })
  async findAll(@Query() dto: FindAllRolDto) {
    return await this.rolService.findAll(dto);
  }

  @Get('privileges')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_ROL)
  @ApiOperation({ summary: 'Catálogo de privilegios disponibles' })
  @ApiResponse({ status: 200, description: 'Privilegios recuperados correctamente' })
  async findPrivileges() {
    return {
      message: 'Privilegios recuperados correctamente',
      flag: Flag.SUCCESS,
      data: Object.values(ItPrivileges),
    };
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_ROL)
  @ApiOperation({ summary: 'Obtener un rol por id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol recuperado correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const rol = await this.rolService.findOne(id);
    return {
      message: 'Rol recuperado correctamente',
      flag: Flag.SUCCESS,
      data: rol,
    };
  }

  @Patch(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.EDIT_ROL)
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol actualizado correctamente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolDto: UpdateRolDto,
  ) {
    const rol = await this.rolService.update(id, updateRolDto);
    return {
      message: 'Rol actualizado correctamente',
      flag: Flag.UPDATED,
      data: rol,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.DELETE_ROL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un rol' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol eliminado correctamente' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.rolService.remove(id);
    return {
      message: 'Rol eliminado correctamente',
      flag: Flag.DELETED,
    };
  }
}
