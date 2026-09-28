import { Injectable, NestMiddleware, Logger, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemLog } from '../../config/entities/system-log.entity';
import { getEnvConfig } from '../../env/envs';
import { JwtService } from '@nestjs/jwt';
import { webhookLoggerSingleton } from '../services/webhook-logger-singleton';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);
  private readonly env = getEnvConfig();

  constructor(
    @InjectRepository(SystemLog)
    private readonly systemLogDAO: Repository<SystemLog>,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, body, headers, ip } = req;
    const userAgent = headers['user-agent'] || '';

    let userId: number | null = null;

    try {
      const token = headers['token'] as string;
      if (token) {
        const payload = this.jwtService.decode(token) as any;
        userId = payload?.id || null;
      }
    } catch (error) {
      // Token invalido: se continua sin userId
    }

    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const { statusCode } = res;

      const logData = {
        method,
        url: originalUrl,
        status: statusCode,
        requestBody: JSON.stringify(body),
        responseBody: res.locals.responseBody || '',
        userAgent,
        ip,
        responseTime,
        userId,
      };

      try {
        const systemLog = this.systemLogDAO.create(logData);
        await this.systemLogDAO.save(systemLog);

        if (this.env.ENABLE_WEBHOOK_LOGS && this.env.WEBHOOK_URL) {
          webhookLoggerSingleton.sendLog(logData).catch((err) => {
            this.logger.error('Webhook log error', err);
          });
        }
      } catch (error) {
        this.logger.error('Error saving log', error);
      }
    });

    next();
  }
}
