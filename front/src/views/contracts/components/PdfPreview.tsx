import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiFileText, FiRefreshCw } from 'react-icons/fi';

import { Button } from '../../../components/Button';
import { fetchContractPdfBlob } from '../requests/contracts.requests';
import { generarPdfDeContrato } from '../helpers/contract-pdf.helper';
import type { Contract } from '../types/contracts.types';

interface PdfPreviewProps {
  contrato: Contract;
  /** Cambiar este valor fuerza a recargar el documento. */
  version?: number;
  className?: string;
  /** Se invoca cuando el PDF se genera desde el propio visor. */
  onGenerado?: (contrato: Contract) => void;
}

/**
 * Visor del PDF del contrato.
 *
 * El `<iframe>` no puede enviar la cabecera `token`, así que el documento se
 * descarga con axios (que sí la envía) y se muestra desde un object URL.
 *
 * Cuando el contrato todavía no tiene PDF (los que se generaron con el servicio
 * de conversión caído) el estado vacío ofrece el botón que lo crea: antes
 * remitía a un botón de reintento que no existía en ninguna pantalla, y de paso
 * le enseñaba a la persona usuaria el nombre de una pieza de infraestructura interna.
 */
export const PdfPreview = ({
  contrato,
  version = 0,
  className = '',
  onGenerado,
}: PdfPreviewProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  const contratoId = contrato.id;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError(false);
      try {
        const generada = await fetchContractPdfBlob(contratoId);
        if (cancelado) {
          URL.revokeObjectURL(generada);
          return;
        }
        objectUrl = generada;
        setUrl(generada);
      } catch {
        if (!cancelado) setError(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    // Sincronización con la API: el estado se actualiza dentro de la promesa.
    void cargar();

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contratoId, version, recarga]);

  const generar = async () => {
    setGenerando(true);
    const actualizado = await generarPdfDeContrato(contrato);
    setGenerando(false);

    if (actualizado) {
      onGenerado?.(actualizado);
      setRecarga((previa) => previa + 1);
    }
  };

  const marco = `rounded-xl border border-white/40 backdrop-blur-md bg-white/40 overflow-hidden ${className}`;

  if (cargando) {
    return (
      <div className={`${marco} flex items-center justify-center min-h-[420px]`}>
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm">Generando la vista previa…</p>
        </div>
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`${marco} flex items-center justify-center min-h-[420px] p-6`}>
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <FiAlertTriangle className="w-9 h-9 text-amber-600" />
          <p className="text-gray-900 font-semibold">
            Este contrato todavía no tiene versión en PDF
          </p>
          <p className="text-sm text-gray-600">
            El documento Word sí está generado. Pulsa el botón y preparamos el
            PDF en unos segundos.
          </p>
          <Button
            onClick={() => void generar()}
            isLoading={generando}
            className="!px-4 !py-2"
          >
            <span className="flex items-center gap-2">
              <FiRefreshCw className="w-4 h-4" />
              Generar el PDF
            </span>
          </Button>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <FiFileText className="w-3.5 h-3.5" />
            Mientras tanto puedes descargar el Word.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${marco} min-h-[420px]`}>
      <iframe
        src={url}
        title="Vista previa del contrato"
        className="w-full h-full min-h-[420px] border-0"
      />
    </div>
  );
};
