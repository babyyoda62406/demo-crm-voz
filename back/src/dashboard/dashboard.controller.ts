import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DeadlinesQueryDto, LimitQueryDto } from './dto/dashboard-query.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { Flag } from '../common/enums/flag.enum';

/**
 * Controlador del cuadro de mando.
 *
 * Todas las rutas son de lectura y exigen `VIEW_DASHBOARD` (o el comodin
 * `ALL_PRIVILEGES`). `GET /api/dashboard/resumen` devuelve de una sola vez todo
 * lo que pinta la pantalla del panel; el resto de rutas existen para consultas
 * puntuales y para el asistente de IA.
 */
@ApiTags('Cuadro de mando')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo de cuadro de mando operativo' })
  ping() {
    return {
      message: 'Módulo de cuadro de mando operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }

  @Get('resumen')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Resumen completo del panel',
    description:
      'Titulares, embudo de clientes por línea y etapa, cartera de inmuebles, contratos, facturación del mes, actividad reciente, tareas del día y firmas pendientes en una única respuesta.',
  })
  @ApiResponse({ status: 200, description: 'Resumen calculado correctamente' })
  async resumen() {
    const data = await this.dashboardService.resumen();

    return {
      message: 'Resumen del cuadro de mando calculado correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('clientes')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Clientes por etapa y por línea de negocio' })
  @ApiResponse({ status: 200, description: 'Métricas calculadas correctamente' })
  async clientes() {
    const data = await this.dashboardService.metricasClientes();

    return {
      message: 'Métricas de clientes calculadas correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('propiedades')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Inmuebles por estado y por zona' })
  @ApiResponse({ status: 200, description: 'Métricas calculadas correctamente' })
  async propiedades() {
    const data = await this.dashboardService.metricasPropiedades();

    return {
      message: 'Métricas de inmuebles calculadas correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('contratos')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Contratos por estado',
    description: 'Incluye el recuento de contratos a la espera de firma.',
  })
  @ApiResponse({ status: 200, description: 'Métricas calculadas correctamente' })
  async contratos() {
    const data = await this.dashboardService.metricasContratos();

    return {
      message: 'Métricas de contratos calculadas correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('facturacion')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Facturación del mes en curso',
    description: 'Base imponible, IVA, total, cobrado, pendiente y comparativa con el mes anterior.',
  })
  @ApiResponse({ status: 200, description: 'Facturación calculada correctamente' })
  async facturacion() {
    const data = await this.dashboardService.facturacionMes();

    return {
      message: 'Facturación del mes calculada correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('actividad')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Actividad reciente del historial de clientes' })
  @ApiResponse({ status: 200, description: 'Actividad recuperada correctamente' })
  async actividad(@Query() dto: LimitQueryDto) {
    const data = await this.dashboardService.actividadReciente(dto.limite ?? 10);

    return {
      message: 'Actividad reciente recuperada correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('tareas-hoy')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Tareas y avisos del día',
    description:
      'Prórrogas a 30 días o menos, contratos enviados sin firmar, clientes en etapa inicial sin actividad y facturas pendientes de cobro. Se calcula al vuelo, sin escribir alertas.',
  })
  @ApiResponse({ status: 200, description: 'Tareas calculadas correctamente' })
  async tareasHoy() {
    const data = await this.dashboardService.tareasHoy();

    return {
      message: `Hay ${data.length} tarea(s) para hoy`,
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('firmas-pendientes')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({ summary: 'Contratos a la espera de firma' })
  @ApiResponse({ status: 200, description: 'Listado recuperado correctamente' })
  async firmasPendientes() {
    const data = await this.dashboardService.listarFirmasPendientes();

    return {
      message: `Hay ${data.length} contrato(s) pendiente(s) de firma`,
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('vencimientos')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_DASHBOARD)
  @ApiOperation({
    summary: 'Vencimientos próximos',
    description:
      'Fin de vigencia de contratos firmados y cobros previstos de facturas emitidas dentro de la ventana indicada.',
  })
  @ApiResponse({ status: 200, description: 'Vencimientos recuperados correctamente' })
  async vencimientos(@Query() dto: DeadlinesQueryDto) {
    const data = await this.dashboardService.listarVencimientos(dto.dias ?? 30);

    return {
      message: `Hay ${data.length} vencimiento(s) en la ventana consultada`,
      flag: Flag.SUCCESS,
      data,
    };
  }
}
