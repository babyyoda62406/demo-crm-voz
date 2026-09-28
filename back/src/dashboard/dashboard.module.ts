import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ASSISTANT_ACTION_TOKENS } from '../common/contracts/assistant-actions';
import { NotificationsModule } from '../notifications/notifications.module';
import { SeedModule } from '../seed/seed.module';
import { Client } from '../clients/entities/client.entity';
import { ClientActivity } from '../clients/entities/client-activity.entity';
import { Property } from '../properties/entities/property.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { Invoice } from '../billing/entities/invoice.entity';

/**
 * Módulo del cuadro de mando.
 *
 * Registra en modo SOLO LECTURA las entidades de los dominios que agrega
 * (clientes, inmuebles, contratos y facturas): el panel nunca escribe en ellas.
 *
 * Importa además `NotificationsModule` y `SeedModule` porque el panel consume
 * sus servicios (avisos vivos y estado de la demo) y los reexporta para que
 * cualquier otro dominio los alcance importando sólo este módulo. El registro
 * en el grafo lo hace `app.module.ts`, no esta importación.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientActivity,
      Property,
      Contract,
      Invoice,
    ]),
    NotificationsModule,
    SeedModule,
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: ASSISTANT_ACTION_TOKENS.DASHBOARD,
      useExisting: DashboardService,
    },
  ],
  exports: [
    DashboardService,
    ASSISTANT_ACTION_TOKENS.DASHBOARD,
    NotificationsModule,
    SeedModule,
  ],
})
export class DashboardModule {}
