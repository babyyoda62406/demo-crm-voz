import { PropertiesService } from './properties.service';
import { PropertyStatus } from './enums/property-status.enum';
import { PropertyType } from './enums/property-type.enum';
import { PropertyZone } from './enums/property-zone.enum';
import { Property } from './entities/property.entity';
import { ItInvestorProfile } from './interfaces/property-match.interface';

/**
 * Baremo de coincidencia entre la cartera y el perfil de un inversor.
 *
 * Es el calculo que decide que se le enseña a un cliente, asi que interesa
 * fijar tanto la puntuacion como las dos reglas de negocio que lleva dentro:
 * el 10 % de tolerancia sobre el presupuesto y el descarte duro por encima.
 */

const servicio = new PropertiesService(null as never, null as never);

const puntuar = (property: Partial<Property>, perfil: Partial<ItInvestorProfile>) =>
  (
    servicio as unknown as {
      scoreProperty: (
        p: Property,
        perfil: ItInvestorProfile,
      ) => {
        score: number;
        descartado: boolean;
        motivos: string[];
        advertencias: string[];
      };
    }
  ).scoreProperty(
    {
      id: 1,
      referencia: 'INM-0001',
      zona: PropertyZone.ALTABRIA,
      tipo: PropertyType.PISO,
      precio: 150000,
      superficie: 90,
      habitaciones: 3,
      estado: PropertyStatus.DISPONIBLE,
      rentabilidadEstimada: 6,
      ...property,
    } as Property,
    { zonas: [], tipos: [], origen: 'parametros', ...perfil } as ItInvestorProfile,
  );

describe('baremo de coincidencia', () => {
  it('sin ningun criterio en el perfil la puntuacion es 0 y no hay descarte', () => {
    const resultado = puntuar({}, {});

    // Sin criterios no hay nada que contar a favor, pero tampoco en contra:
    // la vista los lista todos y el orden lo decide el precio.
    expect(resultado.score).toBe(0);
    expect(resultado.descartado).toBe(false);
    expect(resultado.advertencias).toEqual([]);
  });

  it('un inmueble sin nada que destacar no se queda sin explicacion', () => {
    const resultado = puntuar({ rentabilidadEstimada: null as never }, {});

    expect(resultado.motivos).toEqual(['Disponible en cartera']);
  });

  it('un inmueble que cumple todo puntua 100', () => {
    const resultado = puntuar(
      {},
      {
        zonas: [PropertyZone.ALTABRIA],
        tipos: [PropertyType.PISO],
        presupuestoMin: 100000,
        presupuestoMax: 200000,
        habitacionesMin: 3,
        superficieMin: 80,
        rentabilidadMin: 5,
      },
    );

    expect(resultado.score).toBe(100);
    expect(resultado.advertencias).toEqual([]);
  });

  it('la puntuacion es relativa a los criterios que el perfil SI declara', () => {
    // Solo pide zona y tipo: acertar la zona y fallar el tipo son 35 de 60.
    const resultado = puntuar(
      { tipo: PropertyType.LOCAL },
      { zonas: [PropertyZone.ALTABRIA], tipos: [PropertyType.PISO] },
    );

    expect(resultado.score).toBe(Math.round((35 / 60) * 100));
  });

  it('estar fuera de zona resta, pero no descarta', () => {
    const resultado = puntuar(
      { zona: PropertyZone.RIBAVERDE },
      { zonas: [PropertyZone.ALTABRIA] },
    );

    expect(resultado.score).toBe(0);
    expect(resultado.descartado).toBe(false);
    expect(resultado.advertencias[0]).toContain('fuera de las zonas que busca');
  });

  it('hasta un 10 % por encima del presupuesto puntua a medias y avisa', () => {
    const resultado = puntuar(
      { precio: 165000 },
      { presupuestoMax: 150000 },
    );

    // 25 puntos posibles, 12,5 obtenidos.
    expect(resultado.score).toBe(50);
    expect(resultado.descartado).toBe(false);
    expect(resultado.advertencias[0]).toContain('margen de negociación');
  });

  it('justo en el limite del 10 % todavia entra', () => {
    const resultado = puntuar({ precio: 165000 }, { presupuestoMax: 150000 });
    expect(resultado.descartado).toBe(false);
  });

  it('por encima del 10 % se descarta: es el unico descarte duro del baremo', () => {
    const resultado = puntuar({ precio: 200000 }, { presupuestoMax: 150000 });

    expect(resultado.descartado).toBe(true);
    expect(resultado.advertencias[0]).toContain('por encima de su presupuesto máximo');
  });

  it('por debajo del minimo puntua a medias: no es un fallo, es una señal', () => {
    const resultado = puntuar({ precio: 60000 }, { presupuestoMin: 100000 });

    expect(resultado.score).toBe(50);
    expect(resultado.descartado).toBe(false);
    expect(resultado.advertencias[0]).toContain('por debajo de los');
  });

  it('habitaciones y superficie son de todo o nada sobre el minimo', () => {
    expect(puntuar({ habitaciones: 3 }, { habitacionesMin: 3 }).score).toBe(100);
    expect(puntuar({ habitaciones: 2 }, { habitacionesMin: 3 }).score).toBe(0);
    expect(puntuar({ superficie: 90 }, { superficieMin: 90 }).score).toBe(100);
    expect(puntuar({ superficie: 89 }, { superficieMin: 90 }).score).toBe(0);
  });

  it('un inmueble sin rentabilidad calculada no puntua pero lo dice', () => {
    const resultado = puntuar(
      { rentabilidadEstimada: null as never },
      { rentabilidadMin: 6 },
    );

    expect(resultado.score).toBe(0);
    expect(resultado.advertencias.join(' ')).toContain('no se puede comprobar');
  });

  it('la rentabilidad se informa aunque el perfil no exija minimo, sin alterar la nota', () => {
    const conRenta = puntuar(
      { rentabilidadEstimada: 7.5 },
      { zonas: [PropertyZone.ALTABRIA] },
    );
    const sinRenta = puntuar(
      { rentabilidadEstimada: null as never },
      { zonas: [PropertyZone.ALTABRIA] },
    );

    expect(conRenta.score).toBe(100);
    expect(sinRenta.score).toBe(100);
    expect(conRenta.motivos.join(' ')).toContain('7,5');
  });

  it('la puntuacion nunca se sale de 0..100', () => {
    const perfilCompleto = {
      zonas: [PropertyZone.ALTABRIA],
      tipos: [PropertyType.PISO],
      presupuestoMin: 100000,
      presupuestoMax: 200000,
      habitacionesMin: 3,
      superficieMin: 80,
      rentabilidadMin: 5,
    };

    for (const precio of [0, 90000, 150000, 210000, 1_000_000]) {
      const { score } = puntuar({ precio }, perfilCompleto);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
