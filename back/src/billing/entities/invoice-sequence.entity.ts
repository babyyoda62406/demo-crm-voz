import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

/**
 * Contador de numeración de facturas por ejercicio fiscal.
 *
 * Existe una fila por año. El servicio la bloquea dentro de una transacción
 * (`pg_advisory_xact_lock`) antes de incrementarla, de modo que dos altas
 * simultáneas nunca puedan obtener el mismo número correlativo.
 */
@Entity('invoice_sequences')
export class InvoiceSequence {
  /** Ejercicio fiscal (año) al que pertenece el contador. */
  @PrimaryColumn({ type: 'int' })
  ejercicio: number;

  /** Último número correlativo entregado en ese ejercicio. */
  @Column({ type: 'int', default: 0 })
  ultimoNumero: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
