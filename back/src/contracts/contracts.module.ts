import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractsService } from './contracts.service';
import { ContractTemplatesService } from './contract-templates.service';
import { PdfConverterService } from './pdf-converter.service';
import { ContractsController } from './contracts.controller';
import { Contract } from './entities/contract.entity';
import { ContractTemplate } from './entities/contract-template.entity';
import { Client } from '../clients/entities/client.entity';
import { ASSISTANT_ACTION_TOKENS } from '../common/contracts/assistant-actions';

/**
 * Módulo del dominio Contratos.
 *
 * Las entidades se registran aquí (`autoLoadEntities` está activo), por lo que
 * NO hace falta tocar `database.config.ts` ni `app.module.ts`.
 */
@Module({
  // `Client` se registra solo para leer el nombre del cliente al generar un
  // contrato al que llega su id pero no su nombre (ver `resolverNombreCliente`).
  imports: [TypeOrmModule.forFeature([Contract, ContractTemplate, Client])],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractTemplatesService,
    PdfConverterService,
    {
      provide: ASSISTANT_ACTION_TOKENS.CONTRACT,
      useExisting: ContractsService,
    },
  ],
  exports: [
    ContractsService,
    ContractTemplatesService,
    ASSISTANT_ACTION_TOKENS.CONTRACT,
  ],
})
export class ContractsModule {}
