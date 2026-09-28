import { ItPrivileges } from './it-privileges.interface';

export interface ItJwtPayload {
  id: number;
  email: string;
  privileges: ItPrivileges[];
}
