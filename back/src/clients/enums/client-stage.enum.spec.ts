import { BusinessLine } from './business-line.enum';
import {
  ClientStage,
  StagesByBusinessLine,
  findBusinessLineByStage,
  getFirstStage,
  getStagesByBusinessLine,
  isStageOfBusinessLine,
  normalizeStage,
} from './client-stage.enum';

/**
 * El embudo es lo primero que se rompe cuando se toca una linea de negocio: la
 * etapa destino de un cliente se valida contra esta tabla, y un fallo aqui deja
 * clientes en etapas que su pipeline no dibuja.
 */
describe('embudo por linea de negocio', () => {
  it('cada linea tiene su propio pipeline y empieza por su primera etapa', () => {
    expect(getStagesByBusinessLine(BusinessLine.PSI)[0]).toBe(ClientStage.LEAD);
    expect(getStagesByBusinessLine(BusinessLine.ALQUILER_EMPRESAS)[0]).toBe(
      ClientStage.INTERESADA,
    );
    expect(getStagesByBusinessLine(BusinessLine.REFORMAS)[0]).toBe(
      ClientStage.PREVISTA,
    );

    expect(getFirstStage(BusinessLine.PSI)).toBe(ClientStage.LEAD);
    expect(getFirstStage(BusinessLine.REFORMAS)).toBe(ClientStage.PREVISTA);
  });

  it('no hay etapas repetidas dentro de una misma linea', () => {
    for (const linea of Object.values(BusinessLine)) {
      const etapas = getStagesByBusinessLine(linea);
      expect(new Set(etapas).size).toBe(etapas.length);
    }
  });

  it('toda etapa declarada pertenece al menos a una linea', () => {
    const asignadas = new Set(Object.values(StagesByBusinessLine).flat());
    for (const etapa of Object.values(ClientStage)) {
      expect(asignadas.has(etapa)).toBe(true);
    }
  });

  it('las etapas compartidas lo son a proposito y solo esas', () => {
    const cuenta = new Map<ClientStage, number>();
    for (const etapas of Object.values(StagesByBusinessLine)) {
      for (const etapa of etapas) {
        cuenta.set(etapa, (cuenta.get(etapa) ?? 0) + 1);
      }
    }
    const compartidas = [...cuenta.entries()]
      .filter(([, veces]) => veces > 1)
      .map(([etapa]) => etapa)
      .sort();

    expect(compartidas).toEqual(
      [ClientStage.RESERVA, ClientStage.VISITA].sort(),
    );
  });

  it('isStageOfBusinessLine distingue las etapas propias de las ajenas', () => {
    expect(isStageOfBusinessLine(ClientStage.ARRAS, BusinessLine.PSI)).toBe(
      true,
    );
    expect(isStageOfBusinessLine(ClientStage.ARRAS, BusinessLine.REFORMAS)).toBe(
      false,
    );
    // VISITA existe en PSI y en REFORMAS, pero no en alquiler a empresas.
    expect(isStageOfBusinessLine(ClientStage.VISITA, BusinessLine.PSI)).toBe(
      true,
    );
    expect(
      isStageOfBusinessLine(ClientStage.VISITA, BusinessLine.ALQUILER_EMPRESAS),
    ).toBe(false);
  });
});

describe('normalizeStage', () => {
  it('acepta el valor canonico tal cual', () => {
    expect(normalizeStage('notaria')).toBe(ClientStage.NOTARIA);
    expect(normalizeStage('en_obra')).toBe(ClientStage.EN_OBRA);
  });

  it('tolera mayusculas, tildes, espacios y guiones', () => {
    expect(normalizeStage('  NOTARÍA  ')).toBe(ClientStage.NOTARIA);
    expect(normalizeStage('En Obra')).toBe(ClientStage.EN_OBRA);
    expect(normalizeStage('check-in')).toBe(ClientStage.CHECKIN);
  });

  it('traduce los sinonimos con los que llega un Excel de verdad', () => {
    expect(normalizeStage('nuevo')).toBe(ClientStage.LEAD);
    expect(normalizeStage('primer contacto')).toBe(ClientStage.LEAD);
    expect(normalizeStage('mandato firmado')).toBe(ClientStage.CONTRATO_FIRMADO);
    expect(normalizeStage('escritura')).toBe(ClientStage.NOTARIA);
    expect(normalizeStage('salida')).toBe(ClientStage.CHECKOUT);
  });

  it('rechaza una etapa que no pertenece a la linea indicada', () => {
    // «arras» es real, pero no existe en el pipeline de reformas.
    expect(normalizeStage('arras', BusinessLine.PSI)).toBe(ClientStage.ARRAS);
    expect(normalizeStage('arras', BusinessLine.REFORMAS)).toBeNull();
  });

  it('devuelve null ante basura o vacio', () => {
    expect(normalizeStage('')).toBeNull();
    expect(normalizeStage('   ')).toBeNull();
    expect(normalizeStage(null)).toBeNull();
    expect(normalizeStage(undefined)).toBeNull();
    expect(normalizeStage('etapa que no existe')).toBeNull();
  });
});

describe('findBusinessLineByStage', () => {
  it('resuelve las etapas exclusivas de una linea', () => {
    expect(findBusinessLineByStage(ClientStage.ARRAS)).toBe(BusinessLine.PSI);
    expect(findBusinessLineByStage(ClientStage.CHECKIN)).toBe(
      BusinessLine.ALQUILER_EMPRESAS,
    );
    expect(findBusinessLineByStage(ClientStage.EN_OBRA)).toBe(
      BusinessLine.REFORMAS,
    );
  });

  it('ante una etapa compartida devuelve la primera linea que la declara', () => {
    // Documentado como ayuda, nunca como fuente de verdad: VISITA vive en PSI y
    // en REFORMAS, y aqui gana PSI por orden de declaracion.
    expect(findBusinessLineByStage(ClientStage.VISITA)).toBe(BusinessLine.PSI);
  });
});
