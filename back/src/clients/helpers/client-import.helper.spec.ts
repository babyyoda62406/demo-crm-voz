import {
  getFileExtension,
  mapRowToClientInput,
  parseImportFile,
  SUPPORTED_IMPORT_EXTENSIONS,
} from './client-import.helper';
import {
  normalizeHeader,
  normalizeKey,
  parseAmount,
} from './normalize-text.helper';
import { BusinessLine, ClientType, InterestZone, OperationType } from '../enums';

/**
 * Importacion de clientes desde el Excel del despacho.
 *
 * Es la puerta por la que entran datos escritos a mano durante años: cabeceras
 * con tildes, zonas con grafias distintas y presupuestos en cualquier formato.
 * Si esto falla, lo hace en silencio, dejando campos vacios sin avisar.
 */

describe('normalizacion de texto', () => {
  it('normalizeKey deja una clave comparable', () => {
    expect(normalizeKey('  Línea de Negocio ')).toBe('linea_de_negocio');
    expect(normalizeKey('Check-In')).toBe('check_in');
    expect(normalizeKey('A / B')).toBe('a_b');
    expect(normalizeKey(null)).toBe('');
  });

  it('normalizeHeader ademas quita los separadores, para comparar cabeceras', () => {
    expect(normalizeHeader('Línea de negocio')).toBe('lineadenegocio');
    expect(normalizeHeader('E-Mail')).toBe('email');
  });

  it('parseAmount decide si el punto es decimal o de millar por las cifras que le siguen', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('120000')).toBe(120000);
    expect(parseAmount('120.000')).toBe(120000);
    // Con una o dos cifras detras, el punto es decimal.
    expect(parseAmount('1.5')).toBe(1.5);
    expect(parseAmount('sin dato')).toBeUndefined();
  });
});

describe('getFileExtension', () => {
  it('se queda con la ultima extension, en minusculas', () => {
    expect(getFileExtension('clientes.CSV')).toBe('csv');
    expect(getFileExtension('cartera.2026.xlsx')).toBe('xlsx');
    expect(getFileExtension('sinextension')).toBe('');
  });

  it('las extensiones admitidas incluyen los formatos de hoja de calculo', () => {
    expect(SUPPORTED_IMPORT_EXTENSIONS).toEqual(
      expect.arrayContaining(['csv', 'xlsx', 'xls', 'ods']),
    );
  });
});

describe('parseImportFile (CSV)', () => {
  const csv = (texto: string) => ({
    originalname: 'clientes.csv',
    buffer: Buffer.from(texto, 'utf8'),
  });

  it('lee un CSV con cabecera', () => {
    const filas = parseImportFile(
      csv('Nombre,Email\nÁlvaro,alvaro.aranda@example.com\n'),
    );

    expect(filas).toEqual([
      { Nombre: 'Álvaro', Email: 'alvaro.aranda@example.com' },
    ]);
  });

  it('se traga el BOM que mete Excel al guardar en UTF-8', () => {
    const filas = parseImportFile(csv('﻿Nombre\nÁlvaro\n'));

    // Sin quitarlo, la primera columna se llamaria «﻿Nombre» y no se
    // reconoceria ninguna cabecera de la primera columna.
    expect(Object.keys(filas[0])).toEqual(['Nombre']);
  });

  it('descarta las lineas en blanco del final', () => {
    const filas = parseImportFile(csv('Nombre\nÁlvaro\n\n\n'));
    expect(filas).toHaveLength(1);
  });
});

describe('mapRowToClientInput', () => {
  it('reconoce las cabeceras escritas de varias formas', () => {
    const fila = mapRowToClientInput({
      'Nombre': 'Álvaro',
      'Apellidos': 'Aranda Nieto',
      'E-mail': 'alvaro.aranda@example.com',
      'Teléfono': '+34 600 000 001',
      'Línea de negocio': 'psi',
    });

    expect(fila.nombre).toBe('Álvaro');
    expect(fila.apellidos).toBe('Aranda Nieto');
    expect(fila.email).toBe('alvaro.aranda@example.com');
    expect(fila.telefono).toBe('+34 600 000 001');
    expect(fila.lineaNegocio).toBe(BusinessLine.PSI);
  });

  it('normaliza el correo a minusculas y el documento a mayusculas', () => {
    const fila = mapRowToClientInput({
      Nombre: 'Ana',
      Email: '  Ana.Perez@EXAMPLE.com ',
      NIF: ' 00000001r ',
    });

    expect(fila.email).toBe('ana.perez@example.com');
    expect(fila.documento).toBe('00000001R');
  });

  it('una columna que no conoce se ignora sin romper la importacion', () => {
    const fila = mapRowToClientInput({
      Nombre: 'Ana',
      'Comentario del gestor': 'llamar por las mañanas',
      'Columna vacía': '',
    });

    expect(fila.nombre).toBe('Ana');
    expect(Object.keys(fila)).not.toContain('Comentario del gestor');
  });

  it('acumula las zonas de varias columnas y las deduplica', () => {
    const fila = mapRowToClientInput({
      Nombre: 'Ana',
      Zona: 'Altabria, Valdemor',
      'Zona 2': 'altabria',
    });

    expect(fila.zonasInteres).toEqual([
      InterestZone.ALTABRIA,
      InterestZone.VALDEMOR,
    ]);
  });

  it('descarta en silencio una zona que no esta en el catalogo', () => {
    const fila = mapRowToClientInput({
      Nombre: 'Ana',
      Zona: 'Altabria; Ciudad Inexistente',
    });

    expect(fila.zonasInteres).toEqual([InterestZone.ALTABRIA]);
  });

  it('parte un presupuesto escrito como rango', () => {
    const fila = mapRowToClientInput({
      Nombre: 'Ana',
      Presupuesto: '120.000 - 180.000',
    });

    expect(fila.presupuestoMin).toBe(120000);
    expect(fila.presupuestoMax).toBe(180000);
  });

  it('un presupuesto suelto se entiende como techo', () => {
    const fila = mapRowToClientInput({ Nombre: 'Ana', Presupuesto: '150.000 €' });

    expect(fila.presupuestoMax).toBe(150000);
    expect(fila.presupuestoMin).toBeUndefined();
  });

  it('reconoce el tipo de cliente y el tipo de operacion', () => {
    const fila = mapRowToClientInput({
      Nombre: 'Ana',
      Tipo: 'inversor',
      Operación: 'compra_inversion',
    });

    expect(fila.tipo).toBe(ClientType.INVERSOR);
    expect(fila.tipoOperacion).toBe(OperationType.COMPRA_INVERSION);
  });

  it('una fila sin nada reconocible devuelve un objeto vacio, no basura', () => {
    expect(mapRowToClientInput({ '': '', ' ': ' ' })).toEqual({});
  });
});
