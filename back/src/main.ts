import { loadEnv } from './env/load-env';
loadEnv();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getEnvConfig } from './env/envs';
import { DatabaseConnectionExceptionFilter } from './common/exceptions/database-connection.exception-filter';
import { QueryFailedFilter } from './common/exceptions/query-failed.exception-filter';
import { HttpExceptionFilter } from './common/exceptions/http-exception.filter';
import { CustomValidationPipe } from './common/Pipes/custom-validation.pipe';

// Handlers globales para evitar que un error suelto tumbe el servidor.
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    const env = getEnvConfig();

    // CORS
    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
    });

    // Prefijo global
    app.setGlobalPrefix('api');

    // Pipes de validación globales
    app.useGlobalPipes(
      new CustomValidationPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Filtros de excepción globales.
    // Orden: el último registrado se ejecuta primero.
    // QueryFailedFilter captura errores concretos de TypeORM,
    // DatabaseConnectionExceptionFilter los de conexión a BD y
    // HttpExceptionFilter todo lo demás.
    app.useGlobalFilters(
      new QueryFailedFilter(),
      new DatabaseConnectionExceptionFilter(),
      new HttpExceptionFilter(),
    );

    // Swagger
    const config = new DocumentBuilder()
      .setTitle('CRMIA API')
      .setDescription(
        'API del CRM inmobiliario a medida (personal shopper inmobiliario, alquiler temporal y seguimiento de reformas)',
      )
      .setVersion('1.0')
      .addApiKey(
        {
          type: 'apiKey',
          name: 'token',
          in: 'header',
          description: 'JWT devuelto por POST /api/auth/login',
        },
        'token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    await app.listen(env.PORT);
    console.log(`CRMIA API en marcha: ${env.URL}/api`);
    console.log(`Documentación Swagger: ${env.URL}/api/docs`);
  } catch (error) {
    console.error('Error durante el arranque:', error);
    if (error instanceof Error) console.error('Stack:', error.stack);
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error('No se pudo arrancar la aplicación:', error);
  process.exit(1);
});
