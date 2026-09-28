import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Response } from 'express';
import { Flag } from '../enums/flag.enum';

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  private readonly logger = new Logger(QueryFailedFilter.name);

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error('Query failed', exception.stack);

    const error = exception.driverError as any;

    if (error?.code === '23505') {
      return response.status(HttpStatus.CONFLICT).json({
        message: 'El registro ya existe',
        flag: Flag.CONFLICT,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (error?.code === '23503') {
      return response.status(HttpStatus.PRECONDITION_FAILED).json({
        message: 'Violacion de clave foranea',
        flag: Flag.ERROR,
        statusCode: HttpStatus.PRECONDITION_FAILED,
      });
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Error en la consulta a la base de datos',
      flag: Flag.DATABASE_ERROR,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
}
