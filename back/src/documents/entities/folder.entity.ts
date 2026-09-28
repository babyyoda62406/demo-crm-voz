import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { FileDoc } from './file-doc.entity';

/**
 * Carpeta del Drive propio de CRMIA.
 *
 * El arbol es autorreferencial (`parent` / `hijos`). Las carpetas raiz de un
 * cliente o de un inmueble se crean solas al vincular (ver
 * `DocumentsService.ensureRootFolder`) y quedan marcadas con `esRaiz`.
 *
 * NOTA DE ACOPLAMIENTO: `clienteId` y `propiedadId` son enteros sueltos, SIN
 * clave ajena a las entidades de `clients/` e `properties/`. El Drive tiene que
 * poder compilar y arrancar aunque esos dominios cambien de forma, asi que el
 * vinculo se guarda por id y se resuelve al consultar.
 */
@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 180 })
  nombre: string;

  @ManyToOne(() => Folder, (folder) => folder.hijos, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Folder;

  @Index()
  @Column({ type: 'int', nullable: true })
  parentId: number;

  @OneToMany(() => Folder, (folder) => folder.parent)
  hijos: Folder[];

  @OneToMany(() => FileDoc, (fichero) => fichero.folder)
  ficheros: FileDoc[];

  /** Cliente vinculado (dominio `clients/`). Opcional. */
  @Index()
  @Column({ type: 'int', nullable: true })
  clienteId: number;

  /** Inmueble vinculado (dominio `properties/`). Opcional. */
  @Index()
  @Column({ type: 'int', nullable: true })
  propiedadId: number;

  /** `true` en la carpeta raiz generada automaticamente al vincular. */
  @Column({ type: 'boolean', default: false })
  esRaiz: boolean;

  /** Usuario que creo la carpeta. */
  @Column({ type: 'int', nullable: true })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** Borrado logico: la carpeta desaparece del arbol pero no de la base. */
  @DeleteDateColumn()
  deletedAt: Date;
}
