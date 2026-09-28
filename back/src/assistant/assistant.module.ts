import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantService } from './assistant.service';
import { AssistantController } from './assistant.controller';
import { AssistantLog } from './entities/assistant-log.entity';
import { ElevenLabsService } from './services/elevenlabs.service';
import { NvidiaService } from './services/nvidia.service';
import { ClientsModule } from '../clients/clients.module';
import { PropertiesModule } from '../properties/properties.module';
import { ContractsModule } from '../contracts/contracts.module';
import { DashboardModule } from '../dashboard/dashboard.module';

/**
 * Módulo del asistente de IA.
 *
 * Importa los módulos de dominio que publican sus implementaciones bajo los
 * tokens de `ASSISTANT_ACTION_TOKENS`, de modo que el servicio pueda
 * inyectarlas por token:
 *
 *   constructor(
 *     @Inject(ASSISTANT_ACTION_TOKENS.CLIENT)
 *     private readonly clientActions: IClientActions,
 *   ) {}
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AssistantLog]),
    ClientsModule,
    PropertiesModule,
    ContractsModule,
    DashboardModule,
  ],
  controllers: [AssistantController],
  providers: [AssistantService, ElevenLabsService, NvidiaService],
  exports: [AssistantService],
})
export class AssistantModule {}
