import { PartialType } from '@nestjs/mapped-types';
import { CreateFolderDto } from './create-folder.dto';

/**
 * Actualizacion de carpeta: renombrar y/o mover cambiando `parentId`.
 * `parentId: null` no se admite por el validador; para devolver una carpeta a
 * la raiz se usa `PATCH /documents/folders/:id/move` sin `parentId`.
 */
export class UpdateFolderDto extends PartialType(CreateFolderDto) {}
