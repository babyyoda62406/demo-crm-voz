import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { IInvoiceLine } from '../interfaces/invoice-line.interface';
import { numericTransformer } from '../helpers/money.helper';

/**
 * Factura emitida por la agencia.
 *
 * Los datos del cliente y del contrato se guardan como copia (snapshot) además
 * de su identificador: una factura es un documento cerrado y debe seguir
 * reflejando los datos vigentes el día de su emisión aunque el cliente cambie
 * después de dirección o de razón social.
 *
 * Por el mismo motivo `clienteId` y `contratoId` son columnas sueltas y no
 * relaciones TypeORM: el módulo de facturación no debe romperse ni arrastrar
 * borrados en cascada desde los dominios de clientes y contratos.
 */
@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn()
  id: number;

  /** Número correlativo con formato `FRA-2026-0001`. Único e inmutable. */
  @Index({ unique: true })
  @Column({ length: 20 })
  numero: string;

  /** Ejercicio fiscal de la factura (año de `fechaEmision`). */
  @Column({ type: 'int' })
  ejercicio: number;

  /** Posición dentro del correlativo del ejercicio. */
  @Column({ type: 'int' })
  secuencia: number;

  // --- Cliente (identificador + copia de sus datos fiscales) ---------------

  @Index()
  @Column({ type: 'int' })
  clienteId: number;

  @Column()
  clienteNombre: string;

  /** NIF / CIF / NIE del cliente. */
  @Column({ nullable: true })
  clienteDocumento: string;

  @Column({ nullable: true })
  clienteDireccion: string;

  @Column({ nullable: true })
  clienteEmail: string;

  // --- Contrato de origen (opcional) --------------------------------------

  @Column({ type: 'int', nullable: true })
  contratoId: number;

  /** Referencia legible del contrato del que nace la factura. */
  @Column({ nullable: true })
  contratoReferencia: string;

  // --- Detalle e importes --------------------------------------------------

  /** Líneas de detalle. Sus importes los calcula siempre el servidor. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  lineas: IInvoiceLine[];

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  baseImponible: number;

  /** Tipo de IVA aplicado en porcentaje (21 por defecto, editable). */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 21,
    transformer: numericTransformer,
  })
  tipoIva: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  cuotaIva: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  total: number;

  // --- Estado y fechas -----------------------------------------------------

  @Index()
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.EMITIDA,
  })
  estado: InvoiceStatus;

  /** Fecha de emisión en formato `YYYY-MM-DD`. */
  @Index()
  @Column({ type: 'date' })
  fechaEmision: string;

  /** Fecha de cobro en formato `YYYY-MM-DD`. Sólo con estado `cobrada`. */
  @Column({ type: 'date', nullable: true })
  fechaCobro: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  /** Usuario que emitió la factura. */
  @Column({ type: 'int', nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
