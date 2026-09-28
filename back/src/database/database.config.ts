import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { getEnvConfig } from '../env/envs';
import { User } from '../user/entities/user.entity';
import { Rol } from '../user/entities/rol.entity';
import { SystemLog } from '../config/entities/system-log.entity';
import { Config } from '../config/entities/config.entity';

/**
 * Configuracion de TypeORM.
 *
 * `autoLoadEntities` esta activado, asi que una entidad nueva no obliga a tocar
 * este fichero: basta con registrarla en su propio modulo con
 * `TypeOrmModule.forFeature([MiEntidad])` y queda cargada automaticamente.
 */
export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const env = getEnvConfig();

  const isCloud =
    env.DB_HOST.includes('railway') ||
    env.DB_HOST.includes('render') ||
    env.DB_HOST.includes('heroku') ||
    env.DB_HOST.includes('amazonaws');

  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    entities: [User, Rol, SystemLog, Config],
    autoLoadEntities: true,
    synchronize: env.DB_SYNCHRONIZE,
    logging: env.DB_LOGGING,
    ssl: isCloud ? { rejectUnauthorized: false } : false,
  };
};
