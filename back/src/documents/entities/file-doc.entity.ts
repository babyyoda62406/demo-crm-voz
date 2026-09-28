import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Folder } from './folder.entity';

/**
 * Fichero almacenado en el Drive de CRMIA.
 *
 * El binario vive en disco (`UPLOADS_DIR/docs/...`); en base de datos solo se
 * guarda la ruta relativa, para que mover el almacen no obligue a migrar datos.
 *
 * `version` se incrementa cada vez que ONLYOFFICE devuelve el documento editado.
 * Es la pieza que hace unica la `key` del editor: si la clave no cambia entre
 * versiones, ONLYOFFICE sirve la copia cacheada y el usuario ve el fichero viejo.
 */
@Entity('file_docs')
export class FileDoc {
  @PrimaryGeneratedColumn()
  id: number;

  /** Nombre visible en el Drive, con extension. Es el que se puede renombrar. */
  @Column({ length: 255 })
  nombre: string;

  /** Nombre con el que se subio el fichero. No cambia nunca. */
  @Column({ length: 255 })
  nombreOriginal: string;

  /** Nombre unico con el que se guardo en disco. */
  @Column({ length: 255 })
  nombreAlmacenado: string;

  /** Tipo MIME declarado en la subida. */
  @Column({ length: 180 })
  mime: string;

  /** Tamano en bytes. */
  @Column({ type: 'int', default: 0 })
  tamano: number;

  /** Ruta relativa a `UPLOADS_DIR`, p. ej. `docs/1723380000000-a1b2c3.docx`. */
  @Column({ length: 500 })
  ruta: string;

  @ManyToOne(() => Folder, (folder) => folder.ficheros, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'folderId' })
  folder: Folder;

  @Index()
  @Column({ type: 'int', nullable: true })
  folderId: number;

  /** Cliente vinculado (dominio `clients/`). Opcional, sin clave ajena. */
  @Index()
  @Column({ type: 'int', nullable: true })
  clienteId: number;

  /** Inmueble vinculado (dominio `properties/`). Opcional, sin clave ajena. */
  @Index()
  @Column({ type: 'int', nullable: true })
  propiedadId: number;

  /** Version del contenido. La incrementa cada guardado de ONLYOFFICE. */
  @Column({ type: 'int', default: 1 })
  version: number;

  /** Usuario que subio el fichero. */
  @Column({ type: 'int', nullable: true })
  uploadedById: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /** Borrado logico: el binario permanece en disco por si hay que recuperarlo. */
  @DeleteDateColumn()
  deletedAt: Date;
}
