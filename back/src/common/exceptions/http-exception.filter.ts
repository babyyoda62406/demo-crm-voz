import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Flag } from '../enums/flag.enum';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    if (response.headersSent) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let flag = Flag.ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message || message;
        flag = responseObj.flag || flag;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else {
      this.logger.error(
        `Unexpected error: ${exception.message || 'Unknown error'}`,
        exception.stack,
        `${request.method} ${request.url}`,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception.stack,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    const errorResponse = {
      message,
      flag,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    try {
      response.status(status).json(errorResponse);
    } catch (error) {
      this.logger.error('Error sending error response', error);
    }
  }
}
