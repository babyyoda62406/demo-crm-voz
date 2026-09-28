import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { Property } from './entities/property.entity';
import { ensurePhotosDir } from './config/photo-upload.config';
import { ASSISTANT_ACTION_TOKENS } from '../common/contracts/assistant-actions';

/**
 * Módulo del dominio Inmuebles.
 *
 * La entidad `Property` se carga sola gracias a `autoLoadEntities`; aquí solo
 * se registra su repositorio. El servicio se publica además bajo el token
 * `ASSISTANT_ACTION_TOKENS.PROPERTY` para que el asistente de IA lo consuma sin
 * acoplarse a la clase concreta.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Property])],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    {
      provide: ASSISTANT_ACTION_TOKENS.PROPERTY,
      useExisting: PropertiesService,
    },
  ],
  exports: [PropertiesService, ASSISTANT_ACTION_TOKENS.PROPERTY, TypeOrmModule],
})
export class PropertiesModule {
  constructor() {
    // La carpeta de fotos debe existir antes de la primera subida.
    ensurePhotosDir();
  }
}
