import { SetMetadata } from '@nestjs/common';
import { ItPrivileges } from '../interfaces/it-privileges.interface';

export const PRIVILEGES_KEY = 'privileges';
export const PrivilegesProtected = (...privileges: ItPrivileges[]) =>
  SetMetadata(PRIVILEGES_KEY, privileges);
