import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Flag } from '../enums/flag.enum';

@Catch()
export class DatabaseConnectionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseConnectionExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    // Solo maneja errores especificos de conexion a BD.
    // Si no es un error de BD, la excepcion se propaga al siguiente filter.
    if (exception?.code === 'ECONNREFUSED' || exception?.code === 'ENOTFOUND') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();

      if (response.headersSent) {
        return;
      }

      this.logger.error('Database connection error', exception.stack);
      try {
        response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          message: 'Fallo de conexion con la base de datos',
          flag: Flag.DATABASE_ERROR,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        });
        return;
      } catch (error) {
        this.logger.error('Error sending database error response', error);
        return;
      }
    }

    // Si no es un error de conexion de BD, NO retornar nada:
    // asi la excepcion se propaga al siguiente filter (HttpExceptionFilter).
  }
}
