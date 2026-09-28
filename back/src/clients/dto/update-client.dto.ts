import { PartialType } from '@nestjs/mapped-types';
import { CreateClientDto } from './create-client.dto';

/**
 * Todos los campos del alta, opcionales.
 *
 * El estado (`activo` / `descartado`) NO se toca desde aquí: se cambia con los
 * endpoints dedicados `PATCH /clients/:id/discard` y `PATCH /clients/:id/restore`,
 * que además dejan constancia en el historial.
 */
export class UpdateClientDto extends PartialType(CreateClientDto) {}
