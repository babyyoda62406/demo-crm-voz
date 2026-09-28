import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('system_logs')
export class SystemLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  method: string;

  @Column('text')
  url: string;

  @Column()
  status: number;

  @Column('text', { nullable: true })
  requestBody: string;

  @Column('text', { nullable: true })
  responseBody: string;

  @Column('text', { nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  responseTime: number;

  @Column({ nullable: true })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
