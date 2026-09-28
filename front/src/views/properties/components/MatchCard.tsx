import { FiAlertTriangle, FiCheck, FiEye, FiGrid, FiMapPin, FiMaximize } from 'react-icons/fi';
import { formatCurrencyWhole, formatNumber } from '../../../helpers/formatters';
import {
  PropertyStatusColors,
  PropertyStatusLabels,
  PropertyTypeLabels,
  PropertyZoneLabels,
  scoreTone,
} from '../enums/propertyCatalogs';
import type { Property, PropertyMatch } from '../types/property.types';
import { MatchScore } from './MatchScore';
import { PropertyPhoto } from './PropertyPhoto';

interface MatchCardProps {
  match: PropertyMatch;
  onView: (property: Property) => void;
  /**
   * El cliente no ha fijado ningún criterio: no hay encaje que medir, así que
   * no se enseña una puntuación que no significaría nada.
   */
  sinCriterios?: boolean;
}

/** Coincidencia: inmueble, puntuación, motivos y «peros» que la matizan. */
export const MatchCard = ({ match, onView, sinCriterios = false }: MatchCardProps) => {
  const { property, score, motivos, advertencias } = match;
  const tono = scoreTone(score);

  return (
    <article className="backdrop-blur-xl bg-white/25 rounded-xl border border-white/30 shadow-lg overflow-hidden transition-all duration-200 hover:bg-white/35 hover:shadow-xl">
      <div className="flex gap-3 sm:gap-4 p-4">
        <button
          type="button"
          onClick={() => onView(property)}
          aria-label={`Ver ${property.titulo}`}
          className="self-start flex-shrink-0 rounded-lg overflow-hidden border border-white/40 cursor-pointer"
        >
          <PropertyPhoto
            src={property.fotos?.[0]}
            alt={property.titulo}
            className="w-20 h-20 sm:w-28 sm:h-28"
            placeholderClassName="w-8 h-8"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-700">{property.referencia}</p>
              <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">
                {property.titulo}
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-700">
                <FiMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="line-clamp-1">
                  {property.direccion} · {PropertyZoneLabels[property.zona]}
                </span>
              </p>
            </div>

            {/* En pantallas estrechas el anillo se cambia por una píldora, que
                cabe en la fila de datos sin comerse el ancho del título. */}
            {!sinCriterios && (
              <div className="hidden sm:flex flex-col items-center gap-1 w-20 flex-shrink-0">
                <MatchScore score={score} />
                <span
                  className={`text-[11px] font-semibold text-center leading-tight ${tono.text}`}
                >
                  {tono.label}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {!sinCriterios && (
              <span
                className={`sm:hidden px-2 py-0.5 rounded-md text-xs font-bold backdrop-blur-sm bg-white/60 border border-white/40 ${tono.text}`}
              >
                {score}/100 · {tono.label}
              </span>
            )}
            <span className="text-lg font-bold text-gray-900">
              {formatCurrencyWhole(property.precio)}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-semibold border backdrop-blur-md ${PropertyStatusColors[property.estado]}`}
            >
              {PropertyStatusLabels[property.estado]}
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold backdrop-blur-sm bg-white/50 text-gray-900 border border-white/40">
              {PropertyTypeLabels[property.tipo]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-800">
              <FiMaximize className="w-3.5 h-3.5" />
              {formatNumber(property.superficie)} m²
            </span>
            {property.habitaciones > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-800">
                <FiGrid className="w-3.5 h-3.5" />
                {property.habitaciones} hab.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        <ul className="space-y-1 rounded-lg backdrop-blur-sm bg-white/35 border border-white/30 p-3">
          {motivos.map((motivo) => (
            <li key={motivo} className="flex items-start gap-2 text-sm text-gray-800">
              <FiCheck className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>{motivo}</span>
            </li>
          ))}
        </ul>

        {advertencias.length > 0 && (
          <ul className="space-y-1 rounded-lg backdrop-blur-sm bg-amber-500/15 border border-amber-600/30 p-3">
            {advertencias.map((advertencia) => (
              <li key={advertencia} className="flex items-start gap-2 text-sm text-amber-900">
                <FiAlertTriangle className="w-4 h-4 mt-0.5 text-amber-700 flex-shrink-0" />
                <span>{advertencia}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => onView(property)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold backdrop-blur-md bg-white/40 border border-white/30 text-gray-800 hover:bg-white/60 transition-colors cursor-pointer select-none"
        >
          <FiEye className="w-4 h-4" />
          Ver ficha completa
        </button>
      </div>
    </article>
  );
};
