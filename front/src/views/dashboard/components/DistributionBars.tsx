import type { Recuento } from '../dashboard.types';

interface DistributionBarsProps {
  datos: Recuento[];
  /** Clases del degradado de la barra. */
  gradiente?: string;
  /** Oculta las categorías que están a cero (útil en listas largas como zonas). */
  ocultarVacias?: boolean;
  /** Texto que se muestra cuando no hay ningún dato que pintar. */
  vacio?: string;
  loading?: boolean;
}

/**
 * Barras horizontales de distribución, hechas con CSS puro (sin librería de
 * gráficos): un carril de cristal y una barra de ancho proporcional.
 *
 * El ancho se calcula sobre el MÁXIMO de la serie, no sobre el total, para que
 * la categoría dominante llene el carril y las diferencias se lean de un
 * vistazo. El porcentaje real sobre el total lo calcula el backend y se muestra
 * en el texto de la derecha.
 */
export const DistributionBars = ({
  datos,
  gradiente = 'from-blue-500 to-blue-600',
  ocultarVacias = false,
  vacio = 'Todavía no hay datos que mostrar.',
  loading = false,
}: DistributionBarsProps) => {
  const visibles = ocultarVacias ? datos.filter((item) => item.total > 0) : datos;

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((fila) => (
          <div key={fila} className="space-y-1.5">
            <div className="h-3 w-1/3 rounded bg-white/50 animate-pulse" />
            <div className="h-2.5 w-full rounded-full bg-white/40 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (visibles.length === 0) {
    return <p className="text-sm text-gray-600 py-2">{vacio}</p>;
  }

  const maximo = Math.max(...visibles.map((item) => item.total), 1);

  return (
    <ul className="space-y-3">
      {visibles.map((item) => (
        <li key={item.clave}>
          <div className="flex items-baseline justify-between gap-3 mb-1.5">
            <span className="text-sm font-medium text-gray-800 truncate">{item.label}</span>
            <span className="text-xs text-gray-600 tabular-nums flex-shrink-0">
              <strong className="text-gray-900 text-sm">{item.total}</strong>
              {` · ${item.porcentaje.toFixed(1).replace('.', ',')} %`}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/40 border border-white/30 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${gradiente} transition-all duration-500 ease-out`}
              style={{ width: `${item.total === 0 ? 0 : Math.max((item.total / maximo) * 100, 4)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
