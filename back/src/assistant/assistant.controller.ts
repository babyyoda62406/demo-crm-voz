import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { CreateAssistantCommandDto } from './dto/create-assistant-command.dto';
import { FindAllAssistantLogDto } from './dto/find-all-assistant-log.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import { Flag } from '../common/enums/flag.enum';

/** Tamaño máximo del audio dictado (25 MB ≈ varios minutos en Opus). */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * Controlador del asistente de IA.
 *
 * `POST /api/assistant/command` acepta la orden de dos formas:
 * - `multipart/form-data` con el fichero `audio` (dictado desde el navegador).
 * - `application/json` con el campo `texto` (escrito en la vista de chat).
 */
@ApiTags('Asistente')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('command')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.USE_ASSISTANT)
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AUDIO_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Orden dictada (webm, ogg, mp3, wav...).',
        },
        texto: {
          type: 'string',
          description: 'Orden escrita, alternativa al audio.',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Procesa una orden del asistente (voz o texto) y la ejecuta',
  })
  @ApiResponse({
    status: 200,
    description:
      'Orden procesada: devuelve transcripción, acción, resultado y respuesta',
  })
  @HttpCode(HttpStatus.OK)
  async command(
    @Body() createAssistantCommandDto: CreateAssistantCommandDto,
    @GetUser() user: ItJwtPayload,
    @UploadedFile() audio?: Express.Multer.File,
  ) {
    const data = await this.assistantService.processCommand({
      texto: createAssistantCommandDto?.texto,
      audio: audio
        ? {
            buffer: audio.buffer,
            originalname: audio.originalname,
            mimetype: audio.mimetype,
            size: audio.size,
          }
        : undefined,
      userId: user?.id,
    });

    return {
      message: data.respuesta,
      flag: data.accion
        ? Flag.ASSISTANT_ACTION_EXECUTED
        : Flag.ASSISTANT_ACTION_UNKNOWN,
      data,
    };
  }

  @Get('history')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.USE_ASSISTANT)
  @ApiOperation({ summary: 'Historial paginado de órdenes del asistente' })
  @ApiResponse({ status: 200, description: 'Historial recuperado' })
  async history(
    @Query() findAllAssistantLogDto: FindAllAssistantLogDto,
    @GetUser() user: ItJwtPayload,
  ) {
    const data = await this.assistantService.findAllLogs(
      findAllAssistantLogDto,
      user?.id,
    );

    return {
      message: 'Historial del asistente recuperado correctamente',
      flag: Flag.SUCCESS,
      data,
    };
  }

  @Get('status')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.USE_ASSISTANT)
  @ApiOperation({
    summary: 'Estado del asistente: servicios configurados y acciones activas',
  })
  @ApiResponse({ status: 200, description: 'Estado del asistente' })
  status() {
    return {
      message: 'Estado del asistente recuperado correctamente',
      flag: Flag.SUCCESS,
      data: this.assistantService.getStatus(),
    };
  }

  @Get('ping')
  @Auth(ItPrivileges.ALL_PRIVILEGES, ItPrivileges.USE_ASSISTANT)
  @ApiOperation({ summary: 'Comprobación de disponibilidad del módulo' })
  @ApiResponse({ status: 200, description: 'Módulo del asistente operativo' })
  ping() {
    return {
      message: 'Módulo del asistente operativo',
      flag: Flag.SUCCESS,
      data: null as null,
    };
  }
}
