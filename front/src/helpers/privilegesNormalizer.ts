import { Privileges } from '../enums/Privileges';

export const normalizePrivileges = (privileges: unknown): Privileges[] => {
  if (!Array.isArray(privileges)) return [];

  return privileges
    .filter((p): p is string => typeof p === 'string')
    .map((p) => Object.values(Privileges).find((val) => String(val) === String(p)))
    .filter((p): p is Privileges => p !== undefined);
};

export const hasPrivilege = (
  userPrivileges: Privileges[],
  requiredPrivilege: Privileges | Privileges[],
): boolean => {
  const normalizedUserPrivileges = normalizePrivileges(userPrivileges);

  const hasAllPrivileges = normalizedUserPrivileges.some(
    (p) => String(p) === String(Privileges.ALL_PRIVILEGES),
  );

  if (hasAllPrivileges) return true;

  const required = Array.isArray(requiredPrivilege) ? requiredPrivilege : [requiredPrivilege];

  return required.some((req) =>
    normalizedUserPrivileges.some((userP) => String(userP) === String(req)),
  );
};
