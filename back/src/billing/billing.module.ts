import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceSequence } from './entities/invoice-sequence.entity';

/**
 * Módulo del dominio Facturación.
 *
 * Al añadir entidades basta con registrarlas aquí
 * (`TypeOrmModule.forFeature([Invoice, ...])`): `autoLoadEntities` está activo,
 * por lo que NO hay que tocar `database.config.ts` ni `app.module.ts`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceSequence])],
  controllers: [BillingController],
  providers: [BillingService, InvoicePdfService],
  exports: [BillingService],
})
export class BillingModule {}
