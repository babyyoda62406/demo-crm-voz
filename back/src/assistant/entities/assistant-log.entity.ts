import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AssistantInputType } from '../enums/assistant-input-type.enum';

/**
 * Registro de cada orden procesada por el asistente de IA.
 * Sirve de historial en la vista de chat y de traza de auditoría de las
 * acciones que la IA ejecuta de verdad contra el CRM.
 */
@Entity('assistant_logs')
export class AssistantLog {
  @PrimaryGeneratedColumn()
  id: number;

  /** Si la orden llegó por voz o escrita. */
  @Column({
    type: 'enum',
    enum: AssistantInputType,
    default: AssistantInputType.TEXTO,
  })
  inputType: AssistantInputType;

  /** Texto de la orden: lo escrito, o la transcripción del audio. */
  @Column('text', { nullable: true })
  transcripcion: string;

  /** Nombre canónico de la acción ejecutada (`AssistantActionName`). */
  @Column({ nullable: true })
  accion: string;

  /** Argumentos con los que el modelo invocó la acción. */
  @Column('jsonb', { nullable: true })
  argumentos: Record<string, unknown>;

  /** Carga útil devuelta por el dominio (recortada para no inflar la tabla). */
  @Column('jsonb', { nullable: true })
  resultado: Record<string, unknown>;

  /** `true` si la acción se completó correctamente. */
  @Column({ default: false })
  correcto: boolean;

  /** Confirmación en español redactada por el modelo. */
  @Column('text', { nullable: true })
  respuesta: string;

  /** Motivo del fallo, si lo hubo (modelo, transcripción o dominio). */
  @Column('text', { nullable: true })
  error: string;

  /** Tiempo total de proceso en milisegundos. */
  @Column({ nullable: true })
  duracionMs: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
