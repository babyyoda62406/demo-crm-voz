import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from './rol.entity';
import { UserStatus } from '../../common/enums/user-status.enum';
import { ItPrivileges } from '../../auth/interfaces/it-privileges.interface';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column('simple-array', { default: '' })
  privileges: ItPrivileges[];

  @ManyToOne(() => Rol, { nullable: true })
  @JoinColumn({ name: 'rolId' })
  rol: Rol;

  @Column({ nullable: true })
  rolId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
