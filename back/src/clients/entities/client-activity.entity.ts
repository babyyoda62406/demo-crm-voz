import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Client } from './client.entity';
import { ClientActivityType } from '../enums';

/**
 * Apunte del historial de un cliente: alimenta el timeline de la ficha.
 *
 * Se escriben tanto los apuntes manuales de la persona usuaria (llamada, visita, nota)
 * como los automaticos del sistema (alta, cambio de etapa, descarte,
 * importacion). El historial es solo-anadir: no se edita ni se borra.
 */
@Entity('client_activities')
export class ClientActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @ManyToOne(() => Client, (client) => client.actividades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column()
  clientId: number;

  @Column({
    type: 'enum',
    enum: ClientActivityType,
    default: ClientActivityType.NOTA,
  })
  tipo: ClientActivityType;

  @Column('text')
  descripcion: string;

  /** Fecha del hecho (puede ser anterior al momento de registrarlo). */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;

  /** Nombre del autor, congelado para que el historial no cambie a posteriori. */
  @Column({ nullable: true })
  autor: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'autorId' })
  autorUsuario: User;

  @Column({ nullable: true })
  autorId: number;

  @CreateDateColumn()
  createdAt: Date;
}
