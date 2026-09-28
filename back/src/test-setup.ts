import { Logger } from '@nestjs/common';

/**
 * Silencia el logger de Nest durante los tests.
 *
 * Varios servicios registran a proposito lo que pasa cuando algo va mal (un
 * proveedor de IA que falla, un PDF que no se puede rehacer). Esos caminos se
 * prueban, asi que la salida se llenaba de trazas de error que parecian fallos
 * de la suite sin serlo.
 */
Logger.overrideLogger(false);
