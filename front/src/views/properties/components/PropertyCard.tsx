import { FiEdit2, FiEye, FiGrid, FiMapPin, FiMaximize, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import { formatCurrencyWhole, formatNumber } from '../../../helpers/formatters';
import {
  PropertyStatusLabels,
  PropertyStatusOverlayColors,
  PropertyTypeLabels,
  PropertyZoneLabels,
} from '../enums/propertyCatalogs';
import type { Property } from '../types/property.types';
import { PropertyPhoto } from './PropertyPhoto';

interface PropertyCardProps {
  property: Property;
  onView: (property: Property) => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
}

/** Tarjeta de cristal de un inmueble: foto, estado, precio y datos clave. */
export const PropertyCard = ({ property, onView, onEdit, onDelete }: PropertyCardProps) => {
  const portada = property.fotos?.[0];

  return (
    <article className="group backdrop-blur-xl bg-white/25 rounded-xl border border-white/30 shadow-lg overflow-hidden transition-all duration-200 hover:bg-white/35 hover:shadow-xl hover:-translate-y-0.5 flex flex-col">
      <button
        type="button"
        onClick={() => onView(property)}
        aria-label={`Ver ${property.titulo}`}
        className="relative block h-44 w-full overflow-hidden cursor-pointer"
      >
        <PropertyPhoto
          src={portada}
          alt={property.titulo}
          className="h-44 w-full transition-transform duration-300 group-hover:scale-105"
          placeholderClassName="w-12 h-12"
        />

        <span
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold border backdrop-blur-md ${PropertyStatusOverlayColors[property.estado]}`}
        >
          {PropertyStatusLabels[property.estado]}
        </span>

        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md bg-white/60 text-gray-900 border border-white/40">
          {PropertyTypeLabels[property.tipo]}
        </span>

        {property.fotos.length > 1 && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-xs font-medium backdrop-blur-md bg-slate-900/50 text-white">
            {property.fotos.length} fotos
          </span>
        )}
      </button>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-xs font-semibold text-blue-700 tracking-wide">
            {property.referencia}
          </p>
          <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
            {property.titulo}
          </h3>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-700">
            <FiMapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600" />
            <span className="line-clamp-1">
              {property.direccion} · {PropertyZoneLabels[property.zona]}
            </span>
          </p>
        </div>

        <p className="text-2xl font-bold text-gray-900 drop-shadow-sm">
          {formatCurrencyWhole(property.precio)}
        </p>

        <div className="flex flex-wrap gap-2 text-xs text-gray-800">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30">
            <FiMaximize className="w-3.5 h-3.5" />
            {formatNumber(property.superficie)} m²
          </span>
          {property.habitaciones > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm bg-white/40 border border-white/30">
              <FiGrid className="w-3.5 h-3.5" />
              {property.habitaciones} hab.
            </span>
          )}
          {typeof property.rentabilidadEstimada === 'number' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm bg-emerald-500/15 border border-emerald-600/30 text-emerald-900 font-semibold">
              <FiTrendingUp className="w-3.5 h-3.5" />
              {formatNumber(property.rentabilidadEstimada)} %
            </span>
          )}
        </div>

        <div className="mt-auto pt-2 flex items-center gap-2 border-t border-white/30">
          <button
            type="button"
            onClick={() => onView(property)}
            className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 px-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-colors cursor-pointer select-none shadow-md"
          >
            <FiEye className="w-4 h-4" />
            Ver ficha
          </button>
          <button
            type="button"
            onClick={() => onEdit(property)}
            aria-label={`Editar ${property.titulo}`}
            title="Editar"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg backdrop-blur-md bg-white/40 border border-white/30 text-gray-800 hover:bg-white/60 transition-colors cursor-pointer"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(property)}
            aria-label={`Eliminar ${property.titulo}`}
            title="Eliminar"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg backdrop-blur-md bg-red-500/15 border border-red-500/30 text-red-700 hover:bg-red-500/25 transition-colors cursor-pointer"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
