import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { IContractTemplateField } from '../interfaces/contract-template-field.interface';

/**
 * Plantilla .docx registrada en el sistema.
 *
 * El fichero fisico vive en `back/assets/templates/<archivo>` y ya viene con
 * los marcadores docxtemplater `{campo}`. La columna `campos` describe cada
 * marcador (tipo y etiqueta) para que el front pueda generar el formulario sin
 * saber nada del documento.
 */
@Entity('contract_templates')
export class ContractTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  /** Clave estable usada por la API y por el asistente (p. ej. `alquiler-temporal`). */
  @Column({ unique: true })
  key: string;

  /** Nombre visible en la interfaz. */
  @Column()
  nombre: string;

  /** Descripcion corta de para que sirve la plantilla. */
  @Column({ type: 'text', nullable: true })
  descripcion: string;

  /** Nombre del fichero .docx dentro de `assets/templates`. */
  @Column()
  archivo: string;

  /** Linea de negocio asociada (alquiler-temporal, psi, reserva...). */
  @Column({ nullable: true })
  categoria: string;

  /** Icono sugerido para la interfaz (nombre de react-icons/fi). */
  @Column({ nullable: true })
  icono: string;

  /** Definicion de los marcadores de la plantilla. */
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  campos: IContractTemplateField[];

  /** Indica si la plantilla admite prorroga (crea un contrato derivado). */
  @Column({ default: false })
  admiteProrroga: boolean;

  /** Clave de la plantilla de prorroga asociada, si `admiteProrroga`. */
  @Column({ nullable: true })
  plantillaProrroga: string;

  /** Orden de aparicion en el asistente de creacion. */
  @Column({ type: 'int', default: 0 })
  orden: number;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
