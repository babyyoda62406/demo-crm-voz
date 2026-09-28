import { FiImage } from 'react-icons/fi';
import { photoUrl } from '../requests/properties.requests';

interface PropertyPhotoProps {
  /** URL relativa devuelta por la API. Si falta, se pinta el marcador. */
  src?: string;
  alt: string;
  className?: string;
  /** Tamaño del icono del marcador cuando no hay foto. */
  placeholderClassName?: string;
}

/**
 * Foto de un inmueble con marcador de posición cuando la ficha aún no tiene
 * imágenes. Centraliza la reescritura de la URL relativa de la API.
 */
export const PropertyPhoto = ({
  src,
  alt,
  className = '',
  placeholderClassName = 'w-10 h-10',
}: PropertyPhotoProps) => {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-blue-100/70 to-slate-200/60 ${className}`}
      >
        <FiImage className={`${placeholderClassName} text-blue-600/50`} />
      </div>
    );
  }

  return <img src={photoUrl(src)} alt={alt} className={`object-cover ${className}`} />;
};
