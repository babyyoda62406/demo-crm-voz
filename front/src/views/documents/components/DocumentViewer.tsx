import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiDownload, FiEdit3, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { OnlyOfficeEditor } from './OnlyOfficeEditor';
import { documentsRequests, descargarBlobEnNavegador } from '../documents.requests';
import {
  esImagen,
  esOnlyOffice,
  esPdf,
  getEstiloTipoFichero,
  mensajeErrorDrive,
} from '../documents.helpers';
import type { FileDoc, OnlyOfficeConfigResponse } from '../documents.types';

interface DocumentViewerProps {
  fichero: FileDoc;
  onClose: () => void;
  /** Se llama al cerrar para refrescar el listado (el tamaño puede haber cambiado). */
  onCerradoTrasEdicion?: () => void;
}

/**
 * Visor a pantalla completa del Drive.
 *
 * Tres motores según el formato:
 *  - ofimática (docx, xlsx, pptx…) → editor ONLYOFFICE embebido;
 *  - PDF → visor nativo del navegador dentro de un `iframe`;
 *  - imagen → etiqueta `img`.
 *
 * PDF e imagen se cargan como `blob`: el binario exige la cabecera `token` del
 * CRM, así que no puede apuntarse el `iframe` directamente a la URL de la API.
 */
export const DocumentViewer = ({
  fichero,
  onClose,
  onCerradoTrasEdicion,
}: DocumentViewerProps) => {
  const [configEditor, setConfigEditor] = useState<OnlyOfficeConfigResponse | null>(null);
  const [urlObjeto, setUrlObjeto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const usaOnlyOffice = esOnlyOffice(fichero.nombre);
  const usaVisorNativo = esPdf(fichero.nombre) || esImagen(fichero.nombre);
  const estilo = getEstiloTipoFichero(fichero.nombre);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    let urlCreada: string | null = null;

    const cargar = async () => {
      try {
        if (usaOnlyOffice) {
          const respuesta = await documentsRequests.configEditor(fichero.id);
          if (!cancelado) setConfigEditor(respuesta);
        } else if (usaVisorNativo) {
          const blob = await documentsRequests.descargarBlob(fichero.id);

          // Se envuelve en un `File` con el nombre y el tipo del documento: si
          // la respuesta llega sin `Content-Type`, un blob sin MIME hace que el
          // navegador ofrezca descargar en vez de previsualizar.
          const archivo = new File([blob], fichero.nombre, {
            type: blob.type || fichero.mime,
          });

          urlCreada = window.URL.createObjectURL(archivo);
          if (!cancelado) setUrlObjeto(urlCreada);
        }
      } catch (err) {
        if (!cancelado) setError(mensajeErrorDrive(err, 'No se pudo abrir el documento'));
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    void cargar();

    return () => {
      cancelado = true;
      if (urlCreada) window.URL.revokeObjectURL(urlCreada);
    };
  }, [fichero.id, fichero.mime, fichero.nombre, usaOnlyOffice, usaVisorNativo]);

  const descargar = async () => {
    try {
      const blob = await documentsRequests.descargarBlob(fichero.id);
      descargarBlobEnNavegador(blob, fichero.nombre);
    } catch (err) {
      toast.error(mensajeErrorDrive(err, 'No se pudo descargar el documento'));
    }
  };

  const cerrar = () => {
    onCerradoTrasEdicion?.();
    onClose();
  };

  const contenido = (
    <div className="fixed inset-0 z-[80] flex flex-col" style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
      <header className="flex items-center justify-between gap-4 border-b border-white/30 backdrop-blur-xl bg-white/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`rounded-lg border p-2 ${estilo.fondo}`}>
            <estilo.Icono className={`h-5 w-5 ${estilo.color}`} />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-gray-900 drop-shadow-sm">
              {fichero.nombre}
            </h2>
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              {configEditor?.editable ? (
                <>
                  <FiEdit3 className="h-3.5 w-3.5" /> Edición en vivo · versión {fichero.version}
                </>
              ) : (
                <>
                  <FiEye className="h-3.5 w-3.5" /> Solo lectura
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void descargar()}
            className="flex items-center gap-2 rounded-lg border border-white/30 backdrop-blur-md bg-white/40 px-3 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-white/60 cursor-pointer select-none"
          >
            <FiDownload className="h-4 w-4" />
            <span className="hidden sm:inline">Descargar</span>
          </button>
          <button
            onClick={cerrar}
            aria-label="Cerrar el documento"
            className="rounded-lg border border-white/30 backdrop-blur-md bg-white/40 p-2 text-gray-900 transition-colors hover:bg-white/60 cursor-pointer select-none"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-white/95">
        {cargando && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            <p className="text-base font-medium text-gray-900 select-none">Cargando documento…</p>
          </div>
        )}

        {!cargando && error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <FiAlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="max-w-md text-base font-medium text-gray-900">{error}</p>
          </div>
        )}

        {!cargando && !error && usaOnlyOffice && configEditor && (
          <OnlyOfficeEditor
            scriptUrl={configEditor.scriptUrl}
            config={configEditor.config}
            onGuardado={onCerradoTrasEdicion}
          />
        )}

        {/*
          `#toolbar=0`: la barra del visor de PDF de Chrome titula el documento
          con el identificador interno del blob («6188cd53-7588-…»), que es
          además el nombre con el que guardaría al descargar o imprimir desde
          ahí. Comprobado que ni envolver el blob en un `File` con nombre ni el
          atributo `title` cambian ese texto, así que se oculta esa barra: el
          nombre de verdad y el botón de descarga ya están en la cabecera del
          CRM, justo encima, y el visor queda además con la marca de CRMIA.
        */}
        {!cargando && !error && esPdf(fichero.nombre) && urlObjeto && (
          <iframe
            src={`${urlObjeto}#toolbar=0&navpanes=0`}
            title={fichero.nombre}
            className="h-full w-full border-0"
          />
        )}

        {!cargando && !error && esImagen(fichero.nombre) && urlObjeto && (
          <div className="flex h-full items-center justify-center overflow-auto p-6">
            <img src={urlObjeto} alt={fichero.nombre} className="max-h-full max-w-full object-contain" />
          </div>
        )}

        {!cargando && !error && !usaOnlyOffice && !usaVisorNativo && (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <span className={`rounded-2xl border p-5 ${estilo.fondo}`}>
              <estilo.Icono className={`h-12 w-12 ${estilo.color}`} />
            </span>
            <p className="text-base font-medium text-gray-900">
              Este tipo de archivo no se puede previsualizar dentro del CRM.
            </p>
            <button
              onClick={() => void descargar()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 cursor-pointer select-none"
            >
              <FiDownload className="h-4 w-4" />
              Descargar el archivo
            </button>
          </div>
        )}
      </main>
    </div>
  );

  return createPortal(contenido, document.body);
};
