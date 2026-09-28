import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationRulesService } from './notification-rules.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { Client } from '../clients/entities/client.entity';
import { ClientActivity } from '../clients/entities/client-activity.entity';
import { Invoice } from '../billing/entities/invoice.entity';

/**
 * Módulo de alertas.
 *
 * `Notification` se carga sola gracias a `autoLoadEntities`. Las entidades
 * `Contract`, `Client`, `ClientActivity` e `Invoice` se registran aquí en modo
 * SOLO LECTURA: el motor de reglas las consulta para detectar prórrogas,
 * firmas pendientes, clientes parados y cobros atrasados. No se modifican
 * nunca desde este módulo.
 *
 * REGISTRO: este módulo no aparece en `app.module.ts` (fichero de solo
 * lectura). Entra en el grafo porque `DashboardModule` —que sí está
 * registrado— lo importa. Sus controladores y su CRON quedan activos igual.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      Contract,
      Client,
      ClientActivity,
      Invoice,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationRulesService],
  exports: [NotificationsService, NotificationRulesService, TypeOrmModule],
})
export class NotificationsModule {}
