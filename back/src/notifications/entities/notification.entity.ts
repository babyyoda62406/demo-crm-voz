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
import {
  NotificationPriority,
  NotificationType,
} from '../enums/notification-type.enum';
import { NotificationEntityType } from '../enums/notification-entity-type.enum';

/**
 * Alerta mostrada en la campana de la barra superior.
 *
 * `usuarioId` a `null` significa alerta general del despacho: la ve cualquier
 * usuario. Cuando lleva usuario, solo la ve ese usuario.
 *
 * `claveRegla` es la huella de la alerta automatica (p. ej.
 * `aviso_prorroga:contrato:12`). El motor de reglas la consulta antes de
 * insertar para no repetir cada dia la misma alerta sobre el mismo elemento.
 */
@Entity('notifications')
@Index(['usuarioId', 'leida'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.RECORDATORIO,
  })
  tipo: NotificationType;

  @Column()
  titulo: string;

  @Column('text')
  mensaje: string;

  @Index()
  @Column({ default: false })
  leida: boolean;

  @Column({ type: 'timestamp', nullable: true })
  leidaAt: Date;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIA,
  })
  prioridad: NotificationPriority;

  // --- Destinatario --------------------------------------------------------

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  /** `null` = alerta general visible por todos los usuarios. */
  @Index()
  @Column({ type: 'int', nullable: true })
  usuarioId: number;

  // --- Entidad relacionada -------------------------------------------------

  @Column({
    type: 'enum',
    enum: NotificationEntityType,
    nullable: true,
  })
  entidadTipo: NotificationEntityType;

  @Column({ type: 'int', nullable: true })
  entidadId: number;

  /** Texto identificativo de la entidad (referencia, nombre) para el listado. */
  @Column({ nullable: true })
  entidadNombre: string;

  /** Ruta del front a la que lleva la alerta al pulsarla. */
  @Column({ nullable: true })
  enlace: string;

  /** Huella de la alerta automatica; evita duplicados en pasadas sucesivas. */
  @Index()
  @Column({ nullable: true })
  claveRegla: string;

  // --- Ciclo de vida de las alertas automaticas ----------------------------

  /**
   * Momento en el que el motor de reglas CERRO la alerta por dejar de cumplirse
   * su condicion (la factura se cobro, el contrato se firmo, el cliente avanzo
   * de etapa). Es distinto de `leidaAt`, que significa que alguien la leyo.
   *
   * Una alerta cerrada tambien queda `leida = true`: sale de la campana sin
   * borrarse, de modo que el historial de avisos sigue siendo consultable.
   */
  @Column({ type: 'timestamp', nullable: true })
  cerradaAt: Date;

  /** Explicacion en espanol de por que se cerro la alerta. */
  @Column({ type: 'text', nullable: true })
  motivoCierre: string;

  /**
   * Ultima vez que el motor de reglas reescribio el texto de la alerta con las
   * cifras del dia. Sin esto la campana ensena plazos congelados del dia en que
   * se creo la alerta y contradice al cuadro de mando, que calcula al vuelo.
   */
  @Column({ type: 'timestamp', nullable: true })
  actualizadaAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
