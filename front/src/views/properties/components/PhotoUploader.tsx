import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { FiStar, FiUploadCloud, FiX } from 'react-icons/fi';
import { getErrorMessage } from '../../../helpers/errorHandler';
import { deletePropertyPhoto, uploadPropertyPhotos } from '../requests/properties.requests';
import { PropertyPhoto } from './PropertyPhoto';

interface PhotoUploaderProps {
  fotos: string[];
  onChange: (fotos: string[]) => void;
  /** Inmueble al que pertenecen las fotos ya guardadas; vacío en el alta. */
  propertyId?: number;
  /** Fotos que la ficha ya tenía al abrir el formulario. */
  fotosGuardadas?: string[];
}

/**
 * Subida de fotos del inmueble. Los ficheros viajan al servidor en cuanto se
 * eligen y el formulario guarda únicamente las URLs relativas resultantes.
 * Quitar una foto la borra también del disco, para no dejar huérfanos.
 */
export const PhotoUploader = ({
  fotos,
  onChange,
  propertyId,
  fotosGuardadas = [],
}: PhotoUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setSubiendo(true);
    try {
      const nuevas = await uploadPropertyPhotos(files);
      onChange([...fotos, ...nuevas]);
      toast.success(
        nuevas.length === 1 ? 'Foto subida correctamente' : `${nuevas.length} fotos subidas`,
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se han podido subir las fotos'));
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /**
   * Quita la foto de la galería y la borra del servidor: si ya pertenecía al
   * inmueble se usa su endpoint; si acaba de subirse y todavía no está en
   * ninguna ficha, el de fotos sueltas. Solo se saca de la lista si el borrado
   * ha ido bien, para no perder de vista un fichero que sigue en el disco.
   */
  const quitar = async (foto: string) => {
    setBorrando(foto);
    try {
      const vinculada = Boolean(propertyId) && fotosGuardadas.includes(foto);
      await deletePropertyPhoto(foto, vinculada ? propertyId : undefined);
      onChange(fotos.filter((actual) => actual !== foto));
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se ha podido eliminar la foto'));
    } finally {
      setBorrando(null);
    }
  };

  const hacerPortada = (foto: string) =>
    onChange([foto, ...fotos.filter((actual) => actual !== foto)]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-semibold text-gray-900">
          Fotos {fotos.length > 0 && <span className="text-gray-600">({fotos.length})</span>}
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold backdrop-blur-md bg-white/40 border border-white/30 text-gray-800 hover:bg-white/60 transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiUploadCloud className="w-4 h-4" />
          {subiendo ? 'Subiendo...' : 'Añadir fotos'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      {fotos.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-white/50 backdrop-blur-sm bg-white/25 text-gray-700 hover:bg-white/40 transition-colors cursor-pointer select-none disabled:opacity-50"
        >
          <FiUploadCloud className="w-8 h-8 text-blue-600/70" />
          <span className="text-sm font-medium">
            Añade las fotos del inmueble (JPG, PNG o WebP)
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((foto, posicion) => (
            <div
              key={foto}
              className="relative group rounded-lg overflow-hidden border border-white/40"
            >
              <PropertyPhoto
                src={foto}
                alt={`Foto ${posicion + 1}`}
                className="w-full h-24"
                placeholderClassName="w-6 h-6"
              />

              {posicion === 0 && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md bg-blue-600/80 text-white">
                  Portada
                </span>
              )}

              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {posicion !== 0 && (
                  <button
                    type="button"
                    onClick={() => hacerPortada(foto)}
                    aria-label="Marcar como portada"
                    title="Marcar como portada"
                    className="p-1 rounded backdrop-blur-md bg-white/70 text-amber-700 hover:bg-white cursor-pointer"
                  >
                    <FiStar className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void quitar(foto)}
                  disabled={borrando !== null}
                  aria-label="Eliminar foto"
                  title="Eliminar foto (se borra del servidor)"
                  className="p-1 rounded backdrop-blur-md bg-white/70 text-red-700 hover:bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
