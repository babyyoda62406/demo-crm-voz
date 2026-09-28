import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContractsModule } from '../contracts/contracts.module';
import { Client } from '../clients/entities/client.entity';
import { ClientActivity } from '../clients/entities/client-activity.entity';
import { Property } from '../properties/entities/property.entity';
import { Contract } from '../contracts/entities/contract.entity';
import { ContractTemplate } from '../contracts/entities/contract-template.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { InvoiceSequence } from '../billing/entities/invoice-sequence.entity';
import { User } from '../user/entities/user.entity';
import { Config } from '../config/entities/config.entity';

/**
 * Módulo de la semilla de demostración.
 *
 * Registra en modo ESCRITURA las entidades que puebla el escenario de Vantia.
 * Es el único módulo que escribe fuera de su propio dominio, y lo hace a
 * propósito: la semilla existe para dejar el CRM listo para la demo del 26 de
 * agosto con datos coherentes entre clientes, inmuebles, contratos y facturas.
 *
 * `ContractTemplate` e `InvoiceSequence` se registran porque los contratos de
 * demo se cuelgan de las plantillas ya sembradas y las facturas tienen que
 * respetar el contador de numeración del ejercicio. `User` sirve para firmar el
 * historial con la persona usuaria administradora que exista en la instalación.
 * `Config` guarda la marca de «datos de demostración»: el inventario de lo
 * sembrado, que es lo que permite retirar la demo sin tocar datos reales.
 *
 * REGISTRO: este módulo no aparece en `app.module.ts` (fichero de solo
 * lectura). Entra en el grafo porque `DashboardModule` —que sí está
 * registrado— lo importa, de modo que `/api/seed` queda publicado igual.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Client,
      ClientActivity,
      Property,
      Contract,
      ContractTemplate,
      Invoice,
      InvoiceSequence,
      User,
      Config,
    ]),
    NotificationsModule,
    // Los contratos de demo se generan de verdad —plantilla, .docx y .pdf— con
    // el mismo servicio que usa la ficha, para que la demo pueda descargarlos
    // desde el primer minuto. `ContractsModule` no importa a este, asi que no
    // hay ciclo.
    ContractsModule,
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
