import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { OnlyOfficeService } from './onlyoffice.service';
import { DocumentsController } from './documents.controller';
import { Folder } from './entities/folder.entity';
import { FileDoc } from './entities/file-doc.entity';

/**
 * Módulo del dominio Documentos: Drive propio del CRM y edición con ONLYOFFICE.
 *
 * `DocumentsService` se exporta para que otros dominios (clientes, inmuebles,
 * contratos) puedan crear la carpeta raíz de una entidad y colgar de ella su
 * documentación sin hablar con la base de datos por su cuenta.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Folder, FileDoc])],
  controllers: [DocumentsController],
  providers: [DocumentsService, OnlyOfficeService],
  exports: [DocumentsService, OnlyOfficeService],
})
export class DocumentsModule {}
