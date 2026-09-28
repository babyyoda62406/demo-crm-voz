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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationRulesService } from './notification-rules.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindAllNotificationDto } from './dto/find-all-notification.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import { Flag } from '../common/enums/flag.enum';

/**
 * Controlador de alertas.
 *
 * Todas las rutas literales (`no-leidas`, `contador`, `leer-todas`, `revisar`)
 * se declaran antes que `:id` para que el enrutador no las tome por
 * identificadores.
 *
 * No existe un privilegio propio de notificaciones en `ItPrivileges` (fichero
 * de solo lectura), asi que se reutiliza `VIEW_DASHBOARD`: lo tienen los cuatro
 * roles semilla, que es exactamente quien debe ver la campana.
 */
@ApiTags('Alertas')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationRulesService: NotificationRulesService,
  ) {}

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo de alertas operativo' })
  ping() {
    return {
      message: 'Módulo de alertas operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }

  @Get()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Listar alertas',
    description:
      'Devuelve las alertas del usuario autenticado y las generales del despacho, sin leer primero.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Alertas recuperadas correctamente' })
  async findAll(
    @Query() dto: FindAllNotificationDto,
    @GetUser() user: ItJwtPayload,
  ) {
    return await this.notificationsService.findAll(dto, user?.id);
  }

  @Get('no-leidas')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Últimas alertas sin leer (desplegable de la campana)' })
  @ApiQuery({ name: 'limite', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Alertas recuperadas correctamente' })
  async findUnread(
    @Query('limite') limite: string,
    @GetUser() user: ItJwtPayload,
  ) {
    const tope = Number(limite) > 0 ? Number(limite) : 10;
    const data = await this.notificationsService.findUnread(tope, user?.id);

    return {
      message: 'Alertas sin leer recuperadas correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('contador')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Número de alertas sin leer (badge de la campana)',
    description:
      'Devuelve el total del badge y su desglose. `automaticas` son las que produce el motor de reglas y debe coincidir con «Avisos abiertos» del cuadro de mando; `manuales` son los recordatorios escritos a mano, que el panel no muestra.',
  })
  @ApiResponse({ status: 200, description: 'Contador calculado correctamente' })
  async countUnread(@GetUser() user: ItJwtPayload) {
    const data = await this.notificationsService.countUnreadDesglosado(user?.id);

    return {
      message: 'Contador de alertas calculado correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Post()
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Crear una alerta manualmente' })
  @ApiResponse({ status: 201, description: 'Alerta creada correctamente' })
  async create(@Body() dto: CreateNotificationDto) {
    const data = await this.notificationsService.create(dto);

    return {
      message: 'Alerta creada correctamente',
      flag: Flag.CREATED,
      data,
    };
  }

  @Post('revisar')
  @Auth(ItPrivileges.ALL_PRIVILEGES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ejecutar ahora la revisión de alertas',
    description:
      'Lanza a mano el mismo motor de reglas que corre cada día a las 8:00: prórrogas a 30 días, contratos enviados sin firmar durante 3 días o más, clientes en etapa inicial sin actividad durante 7 días o más y facturas pendientes de cobro. Además pone al día los plazos de los avisos vigentes y retira de la campana los que ya se han resuelto.',
  })
  @ApiResponse({ status: 200, description: 'Revisión ejecutada correctamente' })
  async runRules() {
    const data = await this.notificationRulesService.ejecutarReglas();

    // Repetir la revisión el mismo día no crea nada: se dice tal cual en vez de
    // anunciar alertas nuevas que en realidad ya estaban en la campana. Los
    // cierres y las puestas al día sí se anuncian: son trabajo hecho.
    const partes: string[] = [];
    if (data.total > 0) partes.push(`${data.total} alerta(s) nueva(s)`);
    if (data.actualizadas > 0)
      partes.push(`${data.actualizadas} puesta(s) al día`);
    if (data.cerradas > 0) partes.push(`${data.cerradas} cerrada(s)`);

    const message =
      partes.length === 0
        ? `Revisión completada: sin cambios (${data.detectadas} aviso(s) vigente(s))`
        : `Revisión completada: ${partes.join(', ')}, de ${data.detectadas} aviso(s) vigente(s)`;

    return {
      message,
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Patch('leer-todas')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Marcar como leídas todas las alertas visibles' })
  @ApiResponse({ status: 200, description: 'Alertas marcadas como leídas' })
  async markAllAsRead(@GetUser() user: ItJwtPayload) {
    const total = await this.notificationsService.markAllAsRead(user?.id);

    return {
      message: `${total} alerta(s) marcada(s) como leída(s)`,
      flag: Flag.UPDATED,
      data: { actualizadas: total },
    };
  }

  @Get(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Obtener una alerta por id' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Alerta recuperada correctamente' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.notificationsService.findOne(id);

    return {
      message: 'Alerta recuperada correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Patch(':id/leer')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Marcar una alerta como leída' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Alerta marcada como leída' })
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    const data = await this.notificationsService.markAsRead(id);

    return {
      message: 'Alerta marcada como leída',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Patch(':id/no-leer')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Devolver una alerta al estado de no leída' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Alerta marcada como no leída' })
  async markAsUnread(@Param('id', ParseIntPipe) id: number) {
    const data = await this.notificationsService.markAsUnread(id);

    return {
      message: 'Alerta marcada como no leída',
      flag: Flag.UPDATED,
      data,
    };
  }

  @Delete(':id')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una alerta' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Alerta eliminada correctamente' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.remove(id);

    return {
      message: 'Alerta eliminada correctamente',
      flag: Flag.DELETED,
      data: null as null,
    };
  }
}
