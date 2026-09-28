import { PropertyStatus } from '../../properties/enums/property-status.enum';
import { PropertyType } from '../../properties/enums/property-type.enum';
import { PropertyZone } from '../../properties/enums/property-zone.enum';

/** Inmueble de demostracion de la cartera de Vantia. */
export interface IDemoProperty {
  /** Clave interna para referenciarlo desde los contratos. */
  ref: string;
  referencia: string;
  titulo: string;
  tipo: PropertyType;
  direccion: string;
  zona: PropertyZone;
  poblacion: string;
  provincia: string;
  codigoPostal: string;
  /** Precio de venta (o renta mensual en los inmuebles alquilados), en euros. */
  precio: number;
  superficie: number;
  habitaciones: number;
  estado: PropertyStatus;
  descripcion: string;
  caracteristicas: string[];
  /** Rentabilidad bruta estimada, en porcentaje anual. */
  rentabilidadEstimada: number;
  /** Cliente vinculado (clave `ref` de `DEMO_CLIENTS`), si lo hay. */
  clienteRef?: string;
  notas?: string;
  /** Antiguedad del alta en cartera, en dias. */
  altaHace: number;
}

/**
 * Diez inmuebles repartidos por las siete zonas de operacion, con precios
 * coherentes con el mercado de cada plaza (comarca de Nortia es notablemente
 * mas caro que la Marenza) y con todos los estados comerciales
 * representados, para que el panel muestre un reparto real.
 */
export const DEMO_PROPERTIES: IDemoProperty[] = [
  {
    ref: 'altabria-olivo',
    referencia: 'INM-0001',
    titulo: 'Piso reformado de 3 habitaciones junto al centro',
    tipo: PropertyType.PISO,
    direccion: 'Calle del Olivo, 42, 4.º 1.ª',
    zona: PropertyZone.ALTABRIA,
    poblacion: 'Altabria',
    provincia: 'Nortia',
    codigoPostal: '00110',
    precio: 168000,
    superficie: 85,
    habitaciones: 3,
    estado: PropertyStatus.DISPONIBLE,
    descripcion:
      'Piso exterior de 85 m² en finca con ascensor, a cinco minutos de la plaza Mayor. Reformado en 2021, con cocina office y dos baños completos.',
    caracteristicas: ['Ascensor', 'Balcón', 'Aire acondicionado', 'Reformado'],
    rentabilidadEstimada: 6.1,
    altaHace: 74,
  },
  {
    ref: 'altabria-puerto',
    referencia: 'INM-0002',
    titulo: 'Local comercial a pie de rambla',
    tipo: PropertyType.LOCAL,
    direccion: "Rambla del Puerto, 118, bajos",
    zona: PropertyZone.ALTABRIA,
    poblacion: 'Altabria',
    provincia: 'Nortia',
    codigoPostal: '00111',
    precio: 96000,
    superficie: 120,
    habitaciones: 0,
    estado: PropertyStatus.EN_REFORMA,
    descripcion:
      'Local diáfano de 120 m² con dos escaparates a rambla. En reforma para dividirlo en dos módulos de alquiler independientes.',
    caracteristicas: ['Escaparate a calle', 'Salida de humos', 'Aseo adaptado'],
    rentabilidadEstimada: 8.4,
    clienteRef: 'cifuentes',
    notas: 'Fin de obra previsto en seis semanas. El inversor ya tiene un interesado.',
    altaHace: 51,
  },
  {
    ref: 'valdemor-fuente',
    referencia: 'INM-0003',
    titulo: 'Piso de 4 habitaciones con plaza de aparcamiento',
    tipo: PropertyType.PISO,
    direccion: 'Calle de la Fuente, 27, 3.º 2.ª',
    zona: PropertyZone.VALDEMOR,
    poblacion: 'Valdemor',
    provincia: 'Nortia',
    codigoPostal: '00120',
    precio: 214000,
    superficie: 110,
    habitaciones: 4,
    estado: PropertyStatus.DISPONIBLE,
    descripcion:
      'Vivienda de 110 m² en el eje comercial de Valdemor, con plaza de aparcamiento incluida y trastero. Necesita actualización de baños.',
    caracteristicas: ['Ascensor', 'Aparcamiento', 'Trastero', 'Calefacción'],
    rentabilidadEstimada: 5.4,
    altaHace: 38,
  },
  {
    ref: 'serranova-molino',
    referencia: 'INM-0004',
    titulo: 'Casa unifamiliar con jardín y garaje',
    tipo: PropertyType.CASA,
    direccion: 'Calle del Molino, 9',
    zona: PropertyZone.SERRANOVA,
    poblacion: 'Serranova',
    provincia: 'Nortia',
    codigoPostal: '00130',
    precio: 318000,
    superficie: 178,
    habitaciones: 4,
    estado: PropertyStatus.RESERVADO,
    descripcion:
      'Casa de dos plantas más sótano, con 60 m² de jardín y garaje para dos coches. Estructura en buen estado; pendiente de actualizar instalaciones.',
    caracteristicas: ['Jardín', 'Garaje', 'Chimenea', 'A reformar'],
    rentabilidadEstimada: 4.8,
    clienteRef: 'escalante',
    notas: 'Reservada con documento de reserva. Arras firmadas; notaría en seis semanas.',
    altaHace: 66,
  },
  {
    ref: 'puentealba-parque',
    referencia: 'INM-0005',
    titulo: 'Piso luminoso junto al parque del Molino',
    tipo: PropertyType.PISO,
    direccion: 'Avenida del Parque, 55, 2.º 1.ª',
    zona: PropertyZone.PUENTEALBA,
    poblacion: 'Puentealba',
    provincia: 'Nortia',
    codigoPostal: '00140',
    precio: 142000,
    superficie: 72,
    habitaciones: 3,
    estado: PropertyStatus.DISPONIBLE,
    descripcion:
      'Piso exterior de 72 m² con orientación sur, tres habitaciones y baño reformado. Buena comunicación con Altabria en tren.',
    caracteristicas: ['Ascensor', 'Exterior', 'Baño reformado'],
    rentabilidadEstimada: 6.3,
    altaHace: 29,
  },
  {
    ref: 'maralta-almendros',
    referencia: 'INM-0006',
    titulo: 'Piso amueblado para alquiler temporal de empresa',
    tipo: PropertyType.PISO,
    direccion: 'Calle de los Almendros, 14, 5.º',
    zona: PropertyZone.MARALTA,
    poblacion: 'Maralta',
    provincia: 'Marenza',
    codigoPostal: '00210',
    precio: 94500,
    superficie: 96,
    habitaciones: 3,
    estado: PropertyStatus.ALQUILADO,
    descripcion:
      'Piso completamente amueblado y equipado, destinado a estancias de trabajadores desplazados. Tres dormitorios individuales con escritorio.',
    caracteristicas: ['Amueblado', 'Ascensor', 'Wifi incluido', 'Aire acondicionado'],
    rentabilidadEstimada: 7.6,
    clienteRef: 'orion',
    notas: 'Ocupado por tres técnicos de Construcciones Orión Norte. Renta 1.150 €/mes.',
    altaHace: 218,
  },
  {
    ref: 'maralta-estacion',
    referencia: 'INM-0007',
    titulo: 'Piso de 4 habitaciones para reformar y alquilar',
    tipo: PropertyType.PISO,
    direccion: 'Avenida de la Estación, 33, 2.º',
    zona: PropertyZone.MARALTA,
    poblacion: 'Maralta',
    provincia: 'Marenza',
    codigoPostal: '00210',
    precio: 118000,
    superficie: 105,
    habitaciones: 4,
    estado: PropertyStatus.EN_COMPRA,
    descripcion:
      'Vivienda amplia en zona consolidada, con distribución original. Ideal para reforma y posterior alquiler por habitaciones.',
    caracteristicas: ['A reformar', 'Ascensor', 'Trastero'],
    rentabilidadEstimada: 6.9,
    clienteRef: 'aranda',
    notas: 'Oferta aceptada por el vendedor. Pendiente de firmar arras.',
    altaHace: 33,
  },
  {
    ref: 'albamar-ermita',
    referencia: 'INM-0008',
    titulo: 'Piso céntrico con terraza de 15 m²',
    tipo: PropertyType.PISO,
    direccion: 'Calle de la Ermita, 8, 1.º',
    zona: PropertyZone.ALBAMAR,
    poblacion: 'Albamar',
    provincia: 'Marenza',
    codigoPostal: '00220',
    precio: 87500,
    superficie: 92,
    habitaciones: 3,
    estado: PropertyStatus.DISPONIBLE,
    descripcion:
      'Piso en buen estado con terraza soleada de 15 m². Precio por debajo de mercado por venta rápida de los herederos.',
    caracteristicas: ['Terraza', 'Exterior', 'Cerca del mercado'],
    rentabilidadEstimada: 7.2,
    altaHace: 20,
  },
  {
    ref: 'ribaverde-mayor',
    referencia: 'INM-0009',
    titulo: 'Piso a reformar en el casco antiguo',
    tipo: PropertyType.PISO,
    direccion: 'Calle Mayor, 61, 3.º',
    zona: PropertyZone.RIBAVERDE,
    poblacion: 'Ribaverde',
    provincia: 'Marenza',
    codigoPostal: '00230',
    precio: 76000,
    superficie: 80,
    habitaciones: 3,
    estado: PropertyStatus.EN_REFORMA,
    descripcion:
      'Vivienda de 80 m² en pleno casco antiguo, en obras de reforma integral. Entrega prevista en dos meses, lista para alquilar.',
    caracteristicas: ['En obras', 'Suelos hidráulicos originales', 'Balcón'],
    rentabilidadEstimada: 8.1,
    notas: 'Reforma integral en curso: alicatado terminado, pendiente carpintería.',
    altaHace: 88,
  },
  {
    ref: 'ribaverde-mercado',
    referencia: 'INM-0010',
    titulo: 'Local comercial traspasado junto al mercado',
    tipo: PropertyType.LOCAL,
    direccion: 'Plaza del Mercado, 3, bajos',
    zona: PropertyZone.RIBAVERDE,
    poblacion: 'Ribaverde',
    provincia: 'Marenza',
    codigoPostal: '00230',
    precio: 58000,
    superficie: 64,
    habitaciones: 0,
    estado: PropertyStatus.TRASPASADO,
    descripcion:
      'Local de 64 m² con licencia de actividad vigente, traspasado a una franquicia de panadería en abril.',
    caracteristicas: ['Licencia de actividad', 'Escaparate', 'Aseo'],
    rentabilidadEstimada: 9.0,
    notas: 'Operación cerrada. Se conserva en cartera como referencia de precio de la zona.',
    altaHace: 150,
  },
];
