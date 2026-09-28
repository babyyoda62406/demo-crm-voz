import {
  Module,
  NestModule,
  MiddlewareConsumer,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './database/database.config';
import { getEnvConfig } from './env/envs';
import { LoggerMiddleware } from './common/middlewares/logger.middleware';
import { SystemLog } from './config/entities/system-log.entity';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { RolService } from './user/rol.service';

// Módulos de dominio.
import { ClientsModule } from './clients/clients.module';
import { PropertiesModule } from './properties/properties.module';
import { ContractsModule } from './contracts/contracts.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingModule } from './billing/billing.module';
import { AssistantModule } from './assistant/assistant.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SeedModule } from './seed/seed.module';

const env = getEnvConfig();

/**
 * Módulo raíz de CRMIA.
 *
 * Registra los siete módulos de dominio más los dos transversales
 * (`NotificationsModule`, con el CRON diario de alertas, y `SeedModule`, con la
 * carga de datos de demostración). Ambos se declaran aquí de forma explícita:
 * antes sólo entraban en el grafo porque `DashboardModule` los importaba, lo
 * que dejaba `/api/notifications` y `/api/seed` colgando de un detalle interno
 * de otro dominio. Nest instancia cada módulo una sola vez, así que la doble
 * importación es inofensiva y el grafo queda legible.
 *
 * Las entidades nuevas se cargan solas gracias a `autoLoadEntities`
 * (ver `database/database.config.ts`).
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([SystemLog]),
    JwtModule.register({
      secret: env.JWTSECRET,
      signOptions: { expiresIn: env.JWTEXPIREIN },
    }),
    ScheduleModule.forRoot(),
    ConfigModule,
    AuthModule,
    UserModule,
    ClientsModule,
    PropertiesModule,
    ContractsModule,
    DocumentsModule,
    BillingModule,
    AssistantModule,
    DashboardModule,
    NotificationsModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggerMiddleware],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly userService: UserService,
    private readonly rolService: RolService,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }

  async onModuleInit() {
    try {
      await this.rolService.seedDefaultRoles();
      await this.userService.autoCreateAdmin();
    } catch (error) {
      this.logger.error('Error al crear los datos semilla', error);
    }
  }
}
