import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { SeedDemoDto } from './dto/seed-demo.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { Flag } from '../common/enums/flag.enum';

/**
 * Controlador de la semilla de demostracion.
 *
 * Escribe datos masivamente, asi que exige `ALL_PRIVILEGES`: solo el
 * administrador puede lanzarla.
 */
@ApiTags('Datos de demostración')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo de semilla operativo' })
  ping() {
    return {
      message: 'Módulo de datos de demostración operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }

  @Post('demo')
  @Auth(ItPrivileges.ALL_PRIVILEGES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cargar los datos de demostración',
    description:
      'Puebla el CRM con el escenario de la agencia: 12 clientes con historial, 10 inmuebles en las 7 zonas, 6 contratos en distintos estados, 4 facturas correlativas y las alertas correspondientes. Si ya hay clientes no hace nada, salvo que se envíe `reiniciar: true`. Deja anotado en `configs` el inventario de lo sembrado, para poder retirarlo después sin tocar datos reales.',
  })
  @ApiResponse({ status: 200, description: 'Semilla ejecutada correctamente' })
  async demo(@Body() dto: SeedDemoDto) {
    const data = await this.seedService.poblarDemo(dto?.reiniciar ?? false);

    return {
      message: data.mensaje,
      flag: data.omitido ? Flag.PRECONDITION_FAILED : Flag.CREATED,
      data,
    };
  }

  @Get('demo/estado')
  @Auth(ItPrivileges.ALL_PRIVILEGES)
  @ApiOperation({
    summary: 'Consultar la marca de datos de demostración',
    description:
      'Devuelve el inventario de los registros que creó la semilla (identificadores por tabla y fecha de la siembra), o `null` si esta instalación no tiene datos de demostración marcados.',
  })
  @ApiResponse({ status: 200, description: 'Marca consultada correctamente' })
  async estado() {
    const data = await this.seedService.estadoDataset();

    return {
      message: data
        ? `Esta instalación tiene datos de demostración cargados el ${data.sembradoAt}.`
        : 'Esta instalación no tiene datos de demostración marcados.',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Delete('demo')
  @Auth(ItPrivileges.ALL_PRIVILEGES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retirar los datos de demostración',
    description:
      'Borra EXACTAMENTE los registros anotados en la marca de datos demo y nada más: lo que haya dado de alta el cliente se queda. Si no hay marca no borra nada. Pensado para el día que la instalación de demostración pasa a uso real.',
  })
  @ApiResponse({ status: 200, description: 'Datos de demostración retirados' })
  async retirarDemo() {
    const data = await this.seedService.limpiarDatosDemo();

    return {
      message: data.mensaje,
      flag: data.encontrada ? Flag.DELETED : Flag.PRECONDITION_FAILED,
      data,
    };
  }
}
