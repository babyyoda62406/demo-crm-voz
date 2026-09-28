import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PropertyType } from '../enums/property-type.enum';
import { PropertyStatus } from '../enums/property-status.enum';
import { PropertyZone } from '../enums/property-zone.enum';

/**
 * Convierte las columnas `decimal` de PostgreSQL (que el driver devuelve como
 * cadena) en números de JavaScript, para que la API no exponga precios en texto.
 */
const decimalTransformer = {
  to: (value?: number | null): number | null =>
    value === undefined || value === null ? null : value,
  from: (value?: string | number | null): number | null => {
    if (value === undefined || value === null) return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  },
};

/**
 * Inmueble de la cartera de Vantia.
 * Tabla `properties`; la clase es singular, según la convención del proyecto.
 */
@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn()
  id: number;

  /** Referencia interna del inmueble (`INM-0001`). Se genera si no se indica. */
  @Column({ unique: true })
  referencia: string;

  /** Titular comercial del anuncio interno. */
  @Column()
  titulo: string;

  @Index()
  @Column({ type: 'enum', enum: PropertyType, default: PropertyType.PISO })
  tipo: PropertyType;

  @Column()
  direccion: string;

  /** Una de las siete zonas de operación. */
  @Index()
  @Column({ type: 'enum', enum: PropertyZone })
  zona: PropertyZone;

  /** Población concreta, si difiere del nombre de la zona. */
  @Column({ nullable: true })
  poblacion: string;

  @Column({ nullable: true })
  provincia: string;

  @Column({ nullable: true })
  codigoPostal: string;

  /** Precio de venta o renta mensual, en euros. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  precio: number;

  /** Superficie construida en metros cuadrados. */
  @Column({ type: 'int', default: 0 })
  superficie: number;

  @Column({ type: 'int', default: 0 })
  habitaciones: number;

  @Index()
  @Column({
    type: 'enum',
    enum: PropertyStatus,
    default: PropertyStatus.DISPONIBLE,
  })
  estado: PropertyStatus;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  /** Características libres: «ascensor», «terraza», «a reformar»... */
  @Column('simple-array', { default: '' })
  caracteristicas: string[];

  /** URLs relativas de las fotos subidas (`/api/properties/photos/<fichero>`). */
  @Column('simple-array', { default: '' })
  fotos: string[];

  /** Rentabilidad bruta estimada, en porcentaje anual. */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  rentabilidadEstimada: number;

  /**
   * Cliente propietario o inversor vinculado. Se guarda como identificador
   * suelto (sin clave ajena) para no acoplar la cartera al dominio `clients/`.
   */
  @Column({ type: 'int', nullable: true })
  clientId: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
