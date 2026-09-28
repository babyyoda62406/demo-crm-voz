import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceDto } from './create-invoice.dto';

/**
 * Actualización de factura. El número, el ejercicio y la secuencia no son
 * editables: la numeración correlativa es responsabilidad exclusiva del
 * servicio.
 */
export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}
