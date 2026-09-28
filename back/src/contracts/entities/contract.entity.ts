import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractTemplate } from './contract-template.entity';
import { ContractState } from '../enums/contract-state.enum';

/**
 * Contrato generado a partir de una plantilla.
 *
 * IMPORTANTE: cliente e inmueble se guardan como identificadores sueltos
 * (`clienteId` / `propiedadId`) y no como relaciones TypeORM, porque esas
 * entidades pertenecen a los dominios `clients/` y `properties/`. Asi el
 * modulo de contratos no depende de su calendario de entrega. Se guarda
 * ademas una copia del nombre/direccion para poder listar sin joins.
 */
@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  /** Referencia legible generada por el sistema (CT-2026-0001). */
  @Column({ unique: true })
  referencia: string;

  /** Titulo mostrado en el listado. */
  @Column()
  titulo: string;

  @ManyToOne(() => ContractTemplate, { nullable: true, eager: true })
  @JoinColumn({ name: 'templateId' })
  template: ContractTemplate;

  @Column({ nullable: true })
  templateId: number;

  /** Clave de la plantilla (redundante pero comoda para filtrar y para el asistente). */
  @Index()
  @Column()
  templateKey: string;

  /** Valores con los que se relleno la plantilla. */
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  datos: Record<string, unknown>;

  /** Cliente del dominio `clients/`, si se vinculo. */
  @Column({ type: 'int', nullable: true })
  clienteId: number;

  /** Copia del nombre del cliente en el momento de generar. */
  @Column({ nullable: true })
  clienteNombre: string;

  /** Inmueble del dominio `properties/`, si se vinculo. */
  @Column({ type: 'int', nullable: true })
  propiedadId: number;

  /** Copia de la direccion del inmueble en el momento de generar. */
  @Column({ nullable: true })
  propiedadDireccion: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ContractState,
    default: ContractState.BORRADOR,
  })
  estado: ContractState;

  /** Ruta relativa del .docx generado dentro del directorio de subidas. */
  @Column({ nullable: true })
  docxPath: string;

  /** Ruta relativa del .pdf generado dentro del directorio de subidas. */
  @Column({ nullable: true })
  pdfPath: string;

  /** Token del enlace publico de firma. Se genera al enviar. */
  @Index()
  @Column({ unique: true, nullable: true })
  publicToken: string;

  /** Destinatario al que se envio el enlace. */
  @Column({ nullable: true })
  destinatarioEmail: string;

  @Column({ type: 'timestamp', nullable: true })
  enviadoAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  vistoAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  firmadoAt: Date;

  /** Nombre con el que el cliente firmo (firma simulada). */
  @Column({ nullable: true })
  firmanteNombre: string;

  /** IP desde la que se firmo, como traza minima. */
  @Column({ nullable: true })
  firmanteIp: string;

  /** Contrato del que procede, cuando este es una prorroga o un anexo. */
  @Column({ type: 'int', nullable: true })
  contratoOrigenId: number;

  /** Notas internas de la gestora. */
  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
