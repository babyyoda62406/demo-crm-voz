/** Recuento de lo que ha escrito la semilla de demostracion. */
export interface ISeedResult {
  /** `true` si la semilla no hizo nada por haber datos previos. */
  omitido: boolean;
  /** Explicacion en espanol del resultado, apta para mostrarse tal cual. */
  mensaje: string;
  /** `true` si se vaciaron las tablas antes de sembrar. */
  reiniciado: boolean;
  registros: {
    clientes: number;
    actividades: number;
    propiedades: number;
    contratos: number;
    facturas: number;
    notificaciones: number;
  };
  /** Momento en el que se ejecuto la siembra. */
  ejecutadoAt: string;
}
