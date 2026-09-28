import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Privileges } from '../enums/Privileges';
import { hasPrivilege as hasPrivilegeHelper } from '../helpers/privilegesNormalizer';

export const usePrivileges = () => {
  const { privileges } = useAuth();

  const hasPrivilege = useMemo(
    () =>
      (requiredPrivileges: Privileges | Privileges[]): boolean =>
        hasPrivilegeHelper(privileges, requiredPrivileges),
    [privileges],
  );

  const hasAllPrivileges = useMemo(
    () => hasPrivilegeHelper(privileges, Privileges.ALL_PRIVILEGES),
    [privileges],
  );

  return { privileges, hasPrivilege, hasAllPrivileges };
};
