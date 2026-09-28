/**
 * Contrato de respuesta del backend (NestJS) compartido por todos los dominios.
 */
export interface ItResponse<T = unknown> {
  message: string;
  flag: string;
  data: T;
}

/**
 * Metadatos de paginación que DEVUELVE el backend en los listados.
 *
 * OJO a la asimetría con `ItPaginationQuery`: la respuesta habla de
 * `frame` / `frameSize`, pero la petición se hace con `page` / `size`.
 * No son intercambiables (ver `back/src/common/dto/pagination.dto.ts` y
 * `back/src/common/interfaces/find-all-response.interface.ts`).
 */
export interface ItPaginationMetadata {
  /** Total de registros que cumplen el filtro, no los de la página actual. */
  records: number;
  /** Página devuelta (1-indexada). Equivale al `page` que se pidió. */
  frame: number;
  /** Tamaño de página. Equivale al `size` que se pidió. */
  frameSize: number;
  /** Número de la última página disponible. */
  lastFrame: number;
}

export interface ItFindAllResponse<T> {
  data: T[];
  metadata: ItPaginationMetadata;
}

/**
 * Parámetros de paginación que se ENVÍAN en la query.
 *
 * El backend los valida con `PaginationDto` (`page` / `size`) y con
 * `forbidNonWhitelisted`: mandar `frame` / `frameSize` aquí provoca un 400.
 */
export interface ItPaginationQuery {
  page?: number;
  size?: number;
  [key: string]: unknown;
}
