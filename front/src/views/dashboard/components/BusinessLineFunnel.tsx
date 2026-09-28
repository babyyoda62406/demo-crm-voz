import type { EmbudoLinea } from '../dashboard.types';

interface BusinessLineFunnelProps {
  lineas: EmbudoLinea[];
  loading?: boolean;
}

/**
 * Degradados por línea de negocio. El orden es el que devuelve el backend
 * (PSI, alquiler temporal, reformas), así que se indexa por posición y se
 * repite el ciclo si algún día se añade una cuarta línea.
 */
const PALETA = [
  { barra: 'from-blue-500 to-blue-600', punto: 'bg-blue-500' },
  { barra: 'from-teal-500 to-teal-600', punto: 'bg-teal-500' },
  { barra: 'from-violet-500 to-violet-600', punto: 'bg-violet-500' },
];

/**
 * Embudo de clientes por línea de negocio y etapa.
 *
 * Cada línea es una fila con su total y una tira de segmentos proporcionales a
 * las etapas del pipeline. Las etapas vacías no se pintan como segmento pero sí
 * aparecen en la leyenda inferior, para que se vea qué fase está parada.
 */
export const BusinessLineFunnel = ({ lineas, loading = false }: BusinessLineFunnelProps) => {
  if (loading) {
    return (
      <div className="space-y-5">
        {[0, 1, 2].map((fila) => (
          <div key={fila} className="space-y-2">
            <div className="h-3.5 w-2/5 rounded bg-white/50 animate-pulse" />
            <div className="h-3 w-full rounded-full bg-white/40 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (lineas.length === 0) {
    return (
      <p className="text-sm text-gray-600 py-2">
        Todavía no hay clientes dados de alta en ninguna línea de negocio.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {lineas.map((linea, indice) => {
        const color = PALETA[indice % PALETA.length];
        const conDatos = linea.etapas.filter((etapa) => etapa.total > 0);

        return (
          <div key={linea.linea}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="inline-flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.punto}`}
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {linea.label}
                </span>
              </span>
              <span className="text-xs text-gray-600 tabular-nums flex-shrink-0">
                <strong className="text-gray-900 text-sm">{linea.total}</strong>
                {linea.total === 1 ? ' cliente' : ' clientes'}
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-white/40 border border-white/30 overflow-hidden flex">
              {conDatos.length === 0 ? null : (
                conDatos.map((etapa) => (
                  <div
                    key={etapa.clave}
                    title={`${etapa.label}: ${etapa.total}`}
                    className={`h-full bg-gradient-to-r ${color.barra} border-r border-white/40 last:border-r-0 transition-all duration-500 ease-out`}
                    style={{ width: `${(etapa.total / linea.total) * 100}%` }}
                  />
                ))
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {linea.etapas.map((etapa) => (
                <span
                  key={etapa.clave}
                  className={`text-xs tabular-nums ${
                    etapa.total > 0 ? 'text-gray-700' : 'text-gray-500'
                  }`}
                >
                  {etapa.label}
                  <strong
                    className={`ml-1 ${etapa.total > 0 ? 'text-gray-900' : 'text-gray-500'}`}
                  >
                    {etapa.total}
                  </strong>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
