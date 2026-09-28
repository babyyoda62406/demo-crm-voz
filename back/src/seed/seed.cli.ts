import { loadEnv } from '../env/load-env';
loadEnv();

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

/**
 * Punto de entrada por línea de órdenes de la semilla de demostración.
 *
 * Levanta la aplicación sin servidor HTTP (contexto de aplicación), resuelve
 * `SeedService` y lanza la siembra. Se usa así:
 *
 *   npm run seed            → siembra solo si la base de datos está vacía
 *   npm run seed -- --reset → vacía los datos de demo y vuelve a sembrar
 *
 * `strict: false` es necesario porque `SeedService` no vive en `AppModule`
 * sino en `SeedModule`, al que se llega a través de `DashboardModule`.
 *
 * El proceso termina con código 0 si la siembra fue bien y 1 si falló, para que
 * pueda encadenarse en un script de despliegue.
 */
async function ejecutarSemilla(): Promise<void> {
  const logger = new Logger('Semilla');
  const reiniciar = process.argv.includes('--reset');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const seedService = app.get(SeedService, { strict: false });
    const resultado = await seedService.poblarDemo(reiniciar);

    logger.log(resultado.mensaje);

    if (!resultado.omitido) {
      const { registros } = resultado;
      logger.log(
        `Clientes: ${registros.clientes} · Apuntes de historial: ${registros.actividades} · ` +
          `Inmuebles: ${registros.propiedades} · Contratos: ${registros.contratos} · ` +
          `Facturas: ${registros.facturas} · Alertas: ${registros.notificaciones}`,
      );
    }
  } finally {
    await app.close();
  }
}

ejecutarSemilla()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('No se pudo ejecutar la semilla de demostración:', error);
    process.exit(1);
  });
