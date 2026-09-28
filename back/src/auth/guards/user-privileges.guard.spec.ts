import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserPrivilegesGuard } from './user-privileges.guard';
import { ItPrivileges } from '../interfaces/it-privileges.interface';
import { mergePrivileges } from '../../common/helpers/merge-privileges.helper';
import { DEFAULT_ROLES } from '../../user/seed/default-roles.seed';

/**
 * Control de acceso. Es lo unico del backend que, si falla en silencio, no da
 * error: simplemente deja pasar a quien no debia.
 */

const contexto = (usuario: unknown) =>
  ({
    getHandler: (): (() => void) => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
  }) as never;

const guardCon = (requeridos?: ItPrivileges[]) => {
  const reflector = { get: () => requeridos } as never;
  return new UserPrivilegesGuard(reflector);
};

describe('UserPrivilegesGuard', () => {
  it('sin privilegios declarados basta con estar autenticado', () => {
    expect(
      guardCon(undefined).canActivate(contexto({ id: 1, privileges: [] })),
    ).toBe(true);
    expect(guardCon([]).canActivate(contexto({ id: 1, privileges: [] }))).toBe(
      true,
    );
  });

  it('sin usuario en la peticion responde 401, no 403', () => {
    expect(() =>
      guardCon([ItPrivileges.VIEW_CLIENT]).canActivate(contexto(undefined)),
    ).toThrow(UnauthorizedException);
  });

  it('deja pasar a quien tiene el privilegio exacto', () => {
    expect(
      guardCon([ItPrivileges.VIEW_CLIENT]).canActivate(
        contexto({ id: 1, privileges: [ItPrivileges.VIEW_CLIENT] }),
      ),
    ).toBe(true);
  });

  it('el comodin ALL_PRIVILEGES abre cualquier endpoint', () => {
    expect(
      guardCon([ItPrivileges.DELETE_INVOICE]).canActivate(
        contexto({ id: 1, privileges: [ItPrivileges.ALL_PRIVILEGES] }),
      ),
    ).toBe(true);
  });

  it('basta con UNO de los privilegios declarados', () => {
    expect(
      guardCon([ItPrivileges.ADD_CONTRACT, ItPrivileges.EDIT_CONTRACT]).canActivate(
        contexto({ id: 1, privileges: [ItPrivileges.EDIT_CONTRACT] }),
      ),
    ).toBe(true);
  });

  it('un privilegio de otro dominio no sirve', () => {
    expect(() =>
      guardCon([ItPrivileges.DELETE_CLIENT]).canActivate(
        contexto({ id: 1, privileges: [ItPrivileges.DELETE_PROPERTY] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('un privilegio de lectura no habilita el de borrado del mismo dominio', () => {
    expect(() =>
      guardCon([ItPrivileges.DELETE_CLIENT]).canActivate(
        contexto({ id: 1, privileges: [ItPrivileges.VIEW_CLIENT] }),
      ),
    ).toThrow(ForbiddenException);
  });
});

describe('mergePrivileges', () => {
  it('une los del usuario con los de su rol sin duplicar', () => {
    expect(
      mergePrivileges(
        [ItPrivileges.VIEW_CLIENT, ItPrivileges.EDIT_CLIENT],
        [ItPrivileges.VIEW_CLIENT, ItPrivileges.VIEW_PROPERTY],
      ),
    ).toEqual([
      ItPrivileges.VIEW_CLIENT,
      ItPrivileges.EDIT_CLIENT,
      ItPrivileges.VIEW_PROPERTY,
    ]);
  });

  it('ALL_PRIVILEGES en el usuario colapsa la lista', () => {
    expect(
      mergePrivileges(
        [ItPrivileges.ALL_PRIVILEGES, ItPrivileges.VIEW_CLIENT],
        [ItPrivileges.VIEW_PROPERTY],
      ),
    ).toEqual([ItPrivileges.ALL_PRIVILEGES]);
  });

  it('ALL_PRIVILEGES heredado del rol solo colapsa si el usuario no tiene propios', () => {
    expect(mergePrivileges([], [ItPrivileges.ALL_PRIVILEGES])).toEqual([
      ItPrivileges.ALL_PRIVILEGES,
    ]);
    // Con privilegios propios se conserva la lista completa: los propios son
    // una concesion explicita y no deben perderse al fusionar.
    expect(
      mergePrivileges([ItPrivileges.VIEW_CLIENT], [ItPrivileges.ALL_PRIVILEGES]),
    ).toEqual([ItPrivileges.VIEW_CLIENT, ItPrivileges.ALL_PRIVILEGES]);
  });

  it('sin argumentos devuelve una lista vacia, no undefined', () => {
    expect(mergePrivileges()).toEqual([]);
  });
});

describe('roles semilla', () => {
  const porNombre = new Map(DEFAULT_ROLES.map((rol) => [rol.name, rol.privileges]));

  it('solo el rol de administrador lleva el comodin', () => {
    const conComodin = DEFAULT_ROLES.filter((rol) =>
      rol.privileges.includes(ItPrivileges.ALL_PRIVILEGES),
    ).map((rol) => rol.name);

    expect(conComodin).toEqual(['Administrador']);
  });

  it('el rol de solo lectura no puede escribir ni usar el asistente', () => {
    const colaborador = porNombre.get('Colaborador') ?? [];

    for (const privilegio of colaborador) {
      expect(privilegio.startsWith('VIEW_')).toBe(true);
    }
    expect(colaborador).not.toContain(ItPrivileges.USE_ASSISTANT);
  });

  it('todo privilegio semilla existe en el enum', () => {
    const validos = new Set<string>(Object.values(ItPrivileges));

    for (const rol of DEFAULT_ROLES) {
      for (const privilegio of rol.privileges) {
        expect(validos.has(privilegio)).toBe(true);
      }
    }
  });

  it('ningun rol repite privilegios', () => {
    for (const rol of DEFAULT_ROLES) {
      expect(new Set(rol.privileges).size).toBe(rol.privileges.length);
    }
  });
});
