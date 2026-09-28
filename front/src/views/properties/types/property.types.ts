/** Tipos del dominio Propiedades (espejo de los enums del backend). */

export type PropertyType = 'piso' | 'local' | 'casa';

export type PropertyStatus =
  | 'disponible'
  | 'reservado'
  | 'en_compra'
  | 'en_reforma'
  | 'alquilado'
  | 'traspasado';

export type PropertyZone =
  | 'altabria'
  | 'valdemor'
  | 'serranova'
  | 'puentealba'
  | 'maralta'
  | 'albamar'
  | 'ribaverde';

/** Inmueble tal como lo devuelve la API. */
export interface Property {
  id: number;
  referencia: string;
  titulo: string;
  tipo: PropertyType;
  direccion: string;
  zona: PropertyZone;
  poblacion: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  precio: number;
  superficie: number;
  habitaciones: number;
  estado: PropertyStatus;
  descripcion: string | null;
  caracteristicas: string[];
  fotos: string[];
  rentabilidadEstimada: number | null;
  clientId: number | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo que se envía al crear o actualizar un inmueble. */
export interface PropertyPayload {
  referencia?: string;
  titulo: string;
  tipo: PropertyType;
  direccion: string;
  zona: PropertyZone;
  poblacion?: string;
  codigoPostal?: string;
  precio: number;
  superficie?: number;
  habitaciones?: number;
  estado: PropertyStatus;
  descripcion?: string;
  caracteristicas: string[];
  fotos: string[];
  rentabilidadEstimada?: number;
  notas?: string;
}

/** Filtros de la cartera. */
export interface PropertyFilters {
  search?: string;
  zona?: PropertyZone;
  estado?: PropertyStatus;
  tipo?: PropertyType;
  precioMin?: number;
  precioMax?: number;
}

/** Procedencia de los criterios usados en el cruce de coincidencias. */
export type InvestorProfileSource = 'cliente' | 'parametros' | 'mixto' | 'vacio';

/** Perfil inversor normalizado que devuelve el endpoint de coincidencias. */
export interface InvestorProfile {
  presupuestoMin?: number;
  presupuestoMax?: number;
  zonas: PropertyZone[];
  tipos: PropertyType[];
  habitacionesMin?: number;
  superficieMin?: number;
  rentabilidadMin?: number;
  origen: InvestorProfileSource;
}

/** Inmueble puntuado frente al perfil inversor. */
export interface PropertyMatch {
  property: Property;
  score: number;
  motivos: string[];
  /** Los «peros»: criterios del cliente que el inmueble no cumple. */
  advertencias: string[];
}

/** Respuesta completa de GET /properties/matching/:clientId. */
export interface PropertyMatchResponse {
  clientId: number;
  cliente?: string;
  perfil: InvestorProfile;
  coincidencias: PropertyMatch[];
  evaluadas: number;
  /** Inmuebles apartados por incumplir los criterios del cliente. */
  descartadas: number;
  /** El cliente no tiene criterios: la puntuación no significa nada. */
  sinCriterios: boolean;
}

/** Criterios manuales que se superponen al perfil del cliente. */
export interface MatchCriteria {
  presupuestoMin?: number;
  presupuestoMax?: number;
  zonas: PropertyZone[];
  tipos: PropertyType[];
  habitacionesMin?: number;
  rentabilidadMin?: number;
  incluirNoDisponibles: boolean;
}

/**
 * Cliente reducido para el selector de coincidencias. A propósito no reutiliza
 * el tipo completo de `clients/`: aquí sólo se necesitan `id` y nombre, y
 * depender de la forma entera acoplaría los dos dominios sin ganar nada.
 */
export interface ClientOption {
  id: number;
  nombre: string;
}
