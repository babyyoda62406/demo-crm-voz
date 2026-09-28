import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ClientActivity } from './client-activity.entity';
import {
  BusinessLine,
  ClientStage,
  ClientStatus,
  ClientType,
  InterestZone,
  OperationType,
} from '../enums';

/**
 * Convierte la columna `numeric` de PostgreSQL (que `pg` entrega como cadena)
 * en un `number` de JavaScript, para que el JSON de la API no mezcle tipos.
 */
const numericTransformer = {
  to: (value?: number | null): number | null =>
    value === undefined || value === null ? null : value,
  from: (value?: string | null): number | null =>
    value === undefined || value === null ? null : Number(value),
};

/**
 * Cliente / inversor de Vantia.
 *
 * La `etapa` se guarda como texto (no como `enum` de PostgreSQL) porque el
 * pipeline depende de la `lineaNegocio` y puede crecer sin migracion: la
 * coherencia etapa <-> linea la garantiza `ClientsService`.
 */
@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  // --- Identificacion y contacto ---

  @Index()
  @Column()
  nombre: string;

  @Column({ nullable: true })
  apellidos: string;

  @Index()
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  telefono: string;

  /** NIF / CIF / NIE. */
  @Column({ nullable: true })
  documento: string;

  @Column({
    type: 'enum',
    enum: ClientType,
    default: ClientType.INVERSOR,
  })
  tipo: ClientType;

  // --- Pipeline ---

  @Index()
  @Column({
    type: 'enum',
    enum: BusinessLine,
    default: BusinessLine.PSI,
  })
  lineaNegocio: BusinessLine;

  /** Columna del kanban. Siempre una etapa valida de `lineaNegocio`. */
  @Index()
  @Column({ type: 'varchar', length: 40, default: ClientStage.LEAD })
  etapa: ClientStage;

  // --- Perfil inversor ---

  /** Presupuesto minimo en euros. */
  @Column('numeric', {
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  presupuestoMin: number;

  /** Presupuesto maximo en euros. */
  @Column('numeric', {
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  presupuestoMax: number;

  /** Zonas en las que el cliente quiere operar. */
  @Column('simple-array', { default: '' })
  zonasInteres: InterestZone[];

  @Column({
    type: 'enum',
    enum: OperationType,
    nullable: true,
  })
  tipoOperacion: OperationType;

  // --- Seguimiento ---

  /** Origen del lead: web, referido, portal inmobiliario, etc. */
  @Column({ nullable: true })
  origen: string;

  @Column('text', { nullable: true })
  notas: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.ACTIVO,
  })
  estado: ClientStatus;

  /** Obligatorio cuando `estado` es `descartado`. */
  @Column('text', { nullable: true })
  motivoDescarte: string;

  @Column({ type: 'timestamp', nullable: true })
  fechaDescarte: Date;

  // --- Relaciones ---

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsableId' })
  responsable: User;

  @Column({ nullable: true })
  responsableId: number;

  @OneToMany(() => ClientActivity, (activity) => activity.client)
  actividades: ClientActivity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
