import { Property } from '../entities/property.entity';
import { PropertyType } from '../enums/property-type.enum';
import { PropertyZone } from '../enums/property-zone.enum';

/** De dónde han salido los criterios usados en el cruce. */
export type InvestorProfileSource = 'cliente' | 'parametros' | 'mixto' | 'vacio';

/**
 * Perfil inversor normalizado con el que se cruza la cartera.
 * Se compone de lo almacenado en la ficha del cliente (dominio `clients/`) y
 * de los ajustes puntuales enviados en la petición.
 */
export interface ItInvestorProfile {
  presupuestoMin?: number;
  presupuestoMax?: number;
  zonas: PropertyZone[];
  tipos: PropertyType[];
  habitacionesMin?: number;
  superficieMin?: number;
  rentabilidadMin?: number;
  /** Procedencia de los criterios, para explicarlo en la interfaz. */
  origen: InvestorProfileSource;
}

/** Un inmueble de la cartera con su puntuación frente al perfil inversor. */
export interface ItPropertyMatch {
  property: Property;
  /** Puntuación de 0 a 100 sobre los criterios que el cliente sí ha fijado. */
  score: number;
  /** Motivos en español que justifican la puntuación. */
  motivos: string[];
  /** Los «peros»: criterios del cliente que el inmueble NO cumple. */
  advertencias: string[];
}

/** Coincidencia puntuada con la marca interna de descarte (no sale de la API). */
export interface ItScoredProperty extends ItPropertyMatch {
  /** El inmueble incumple un criterio duro y no debe ofrecerse. */
  descartado: boolean;
}

/** Respuesta completa del endpoint de coincidencias. */
export interface ItPropertyMatchResponse {
  clientId: number;
  /** Nombre del cliente si se ha podido leer su ficha. */
  cliente?: string;
  perfil: ItInvestorProfile;
  coincidencias: ItPropertyMatch[];
  /** Inmuebles evaluados antes de aplicar el límite. */
  evaluadas: number;
  /** Inmuebles apartados por incumplir criterios o quedarse bajo el umbral. */
  descartadas: number;
  /**
   * El cliente no tiene ningún criterio: se enseña la cartera disponible pero
   * la puntuación no significa nada y la interfaz no debe presentarla.
   */
  sinCriterios: boolean;
}
