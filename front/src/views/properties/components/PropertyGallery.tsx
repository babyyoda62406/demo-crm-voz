import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiImage } from 'react-icons/fi';
import { PropertyPhoto } from './PropertyPhoto';

interface PropertyGalleryProps {
  fotos: string[];
  titulo: string;
}

/** Galería del detalle: foto grande con navegación y tira de miniaturas. */
export const PropertyGallery = ({ fotos, titulo }: PropertyGalleryProps) => {
  const clave = fotos.join('|');
  // La foto activa se guarda junto a la galería a la que pertenece: al abrir
  // otro inmueble la selección vuelve sola a la primera imagen, sin efectos.
  const [seleccion, setSeleccion] = useState({ clave, indice: 0 });

  const total = fotos.length;
  const indice =
    seleccion.clave === clave && total > 0 ? Math.min(seleccion.indice, total - 1) : 0;

  const mover = (paso: number) => {
    if (!total) return;
    setSeleccion({ clave, indice: (indice + paso + total) % total });
  };

  // Sin fotos no se pinta un hueco gris de 320 px que empuja los datos fuera de
  // pantalla: basta una franja que lo diga y deje sitio a la ficha.
  if (!total) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/30 bg-white/25 backdrop-blur-md px-4 py-3">
        <FiImage className="w-5 h-5 flex-shrink-0 text-blue-600/60" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">Sin fotos</p>
          <p className="text-xs text-gray-700">
            Añádelas desde «Editar inmueble» para que la ficha entre por los ojos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-white/30 bg-white/20 backdrop-blur-md">
        <PropertyPhoto
          src={fotos[indice]}
          alt={`${titulo} — foto ${indice + 1}`}
          className="w-full h-72 sm:h-80"
          placeholderClassName="w-14 h-14"
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full backdrop-blur-md bg-white/60 border border-white/40 text-gray-900 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full backdrop-blur-md bg-white/60 border border-white/40 text-gray-900 hover:bg-white/80 transition-colors cursor-pointer"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md text-xs font-semibold backdrop-blur-md bg-slate-900/55 text-white">
              {indice + 1} / {total}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, posicion) => (
            <button
              key={foto}
              type="button"
              onClick={() => setSeleccion({ clave, indice: posicion })}
              aria-label={`Ver foto ${posicion + 1}`}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                posicion === indice
                  ? 'border-blue-600 shadow-md'
                  : 'border-white/40 opacity-70 hover:opacity-100'
              }`}
            >
              <PropertyPhoto
                src={foto}
                alt={`${titulo} — miniatura ${posicion + 1}`}
                className="w-20 h-16"
                placeholderClassName="w-5 h-5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
