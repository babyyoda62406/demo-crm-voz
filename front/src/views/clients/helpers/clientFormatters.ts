import { formatCurrency } from '../../../helpers/formatters';
import type { Client } from '../requests/clients.requests';

/** Nombre y apellidos en una sola cadena, sin espacios sobrantes. */
export const getFullName = (client: Client): string =>
  `${client.nombre} ${client.apellidos ?? ''}`.trim();

/**
 * Presupuesto legible: rango completo, solo techo, solo suelo o nada.
 * Devuelve `null` cuando el cliente no tiene presupuesto informado.
 */
export const describeBudget = (client: Client): string | null => {
  const { presupuestoMin, presupuestoMax } = client;

  if (presupuestoMin != null && presupuestoMax != null) {
    return `${formatCurrency(presupuestoMin)} – ${formatCurrency(presupuestoMax)}`;
  }
  if (presupuestoMax != null) return `Hasta ${formatCurrency(presupuestoMax)}`;
  if (presupuestoMin != null) return `Desde ${formatCurrency(presupuestoMin)}`;
  return null;
};
