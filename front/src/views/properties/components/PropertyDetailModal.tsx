import {
  FiCalendar,
  FiEdit2,
  FiGrid,
  FiHash,
  FiHome,
  FiMapPin,
  FiMaximize,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { formatCurrencyWhole, formatDate, formatNumber } from '../../../helpers/formatters';
import {
  PropertyStatusColors,
  PropertyStatusLabels,
  PropertyTypeLabels,
  PropertyZoneLabels,
} from '../enums/propertyCatalogs';
import type { Property } from '../types/property.types';
import { PropertyGallery } from './PropertyGallery';

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (property: Property) => void;
}

interface DatoProps {
  icon: IconType;
  label: string;
  value: string;
}

const Dato = ({ icon: Icon, label, value }: DatoProps) => (
  <div className="flex items-start gap-3 p-3 rounded-lg backdrop-blur-sm bg-white/35 border border-white/30">
    <Icon className="w-4 h-4 mt-0.5 text-blue-700 flex-shrink-0" />
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-600">{label}</p>
      <p className="text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  </div>
);

/** Ficha completa del inmueble: galería, datos, características y notas. */
export const PropertyDetailModal = ({
  property,
  isOpen,
  onClose,
  onEdit,
}: PropertyDetailModalProps) => {
  if (!property) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={property.titulo} size="xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 rounded-lg text-sm font-semibold border backdrop-blur-md ${PropertyStatusColors[property.estado]}`}
          >
            {PropertyStatusLabels[property.estado]}
          </span>
          <span className="px-3 py-1 rounded-lg text-sm font-semibold backdrop-blur-md bg-white/50 text-gray-900 border border-white/40">
            {PropertyTypeLabels[property.tipo]}
          </span>
          <span className="px-3 py-1 rounded-lg text-sm font-semibold backdrop-blur-md bg-blue-500/15 text-blue-900 border border-blue-600/30">
            {PropertyZoneLabels[property.zona]}
          </span>
          <span className="ml-auto text-2xl font-bold text-gray-900 drop-shadow-sm">
            {formatCurrencyWhole(property.precio)}
          </span>
        </div>

        <PropertyGallery fotos={property.fotos ?? []} titulo={property.titulo} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Dato icon={FiHash} label="Referencia" value={property.referencia} />
          <Dato icon={FiMapPin} label="Dirección" value={property.direccion} />
          <Dato
            icon={FiHome}
            label="Población"
            value={[property.poblacion, property.codigoPostal].filter(Boolean).join(' · ') || '—'}
          />
          <Dato
            icon={FiMaximize}
            label="Superficie"
            value={`${formatNumber(property.superficie)} m²`}
          />
          <Dato
            icon={FiGrid}
            label="Habitaciones"
            value={property.tipo === 'local' ? 'No aplica' : String(property.habitaciones)}
          />
          <Dato
            icon={FiTrendingUp}
            label="Rentabilidad estimada"
            value={
              typeof property.rentabilidadEstimada === 'number'
                ? `${formatNumber(property.rentabilidadEstimada)} %`
                : 'Sin estimar'
            }
          />
          <Dato
            icon={FiUser}
            label="Cliente vinculado"
            value={property.clientId ? `Cliente n.º ${property.clientId}` : 'Sin vincular'}
          />
          <Dato icon={FiCalendar} label="Alta en cartera" value={formatDate(property.createdAt)} />
          <Dato
            icon={FiCalendar}
            label="Última actualización"
            value={formatDate(property.updatedAt)}
          />
        </div>

        {property.caracteristicas?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Características</h3>
            <div className="flex flex-wrap gap-2">
              {property.caracteristicas.map((caracteristica) => (
                <span
                  key={caracteristica}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-sm bg-blue-600/15 text-blue-900 border border-blue-600/25"
                >
                  {caracteristica}
                </span>
              ))}
            </div>
          </div>
        )}

        {property.descripcion && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Descripción</h3>
            <p className="text-sm text-gray-800 whitespace-pre-line rounded-lg backdrop-blur-sm bg-white/35 border border-white/30 p-3">
              {property.descripcion}
            </p>
          </div>
        )}

        {property.notas && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Notas internas</h3>
            <p className="text-sm text-gray-800 whitespace-pre-line rounded-lg backdrop-blur-sm bg-amber-500/10 border border-amber-500/25 p-3">
              {property.notas}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            onClick={() => onEdit(property)}
            className="inline-flex items-center gap-2"
          >
            <FiEdit2 className="w-4 h-4" />
            Editar inmueble
          </Button>
        </div>
      </div>
    </Modal>
  );
};
