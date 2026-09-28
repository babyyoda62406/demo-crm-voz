import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { ClientActivity } from './entities/client-activity.entity';
import { User } from '../user/entities/user.entity';
import { ASSISTANT_ACTION_TOKENS } from '../common/contracts/assistant-actions';

/**
 * Módulo del dominio Clientes.
 *
 * `User` se registra aquí en modo solo-lectura: el servicio lo consulta para
 * firmar los apuntes del historial con el nombre del usuario que los provoca.
 *
 * `autoLoadEntities` está activo, así que `Client` y `ClientActivity` se cargan
 * solas: no hay que tocar `database.config.ts` ni `app.module.ts`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientActivity, User])],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    { provide: ASSISTANT_ACTION_TOKENS.CLIENT, useExisting: ClientsService },
  ],
  exports: [ClientsService, ASSISTANT_ACTION_TOKENS.CLIENT],
})
export class ClientsModule {}
