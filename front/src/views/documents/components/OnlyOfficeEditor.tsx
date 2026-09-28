import { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import type { OnlyOfficeConfig } from '../documents.types';

interface DocEditorInstancia {
  destroyEditor: () => void;
  /** Respuesta a onRequestUsers: ficha de usuarios para comentarios/menciones. */
  setUsers?: (datos: { c: string; users: Array<{ id: string; name: string }> }) => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: unknown) => DocEditorInstancia;
    };
  }
}

/**
 * Carga del script del Document Server.
 *
 * La promesa se cachea a nivel de módulo: `api.js` registra `window.DocsAPI` de
 * forma global y volver a inyectarlo al abrir un segundo documento provoca
 * editores fantasma.
 */
let cargaEnCurso: Promise<void> | null = null;

const cargarScriptOnlyOffice = (url: string): Promise<void> => {
  if (window.DocsAPI) return Promise.resolve();
  if (cargaEnCurso) return cargaEnCurso;

  cargaEnCurso = new Promise<void>((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolver();
    script.onerror = () => {
      cargaEnCurso = null;
      rechazar(new Error('No se pudo cargar el editor de documentos'));
    };
    document.body.appendChild(script);
  });

  return cargaEnCurso;
};

interface OnlyOfficeEditorProps {
  scriptUrl: string;
  config: OnlyOfficeConfig;
  /** Se dispara cuando ONLYOFFICE confirma que ha guardado los cambios. */
  onGuardado?: () => void;
}

/**
 * Editor ONLYOFFICE embebido.
 *
 * La configuración llega ya firmada del backend (`token`): aquí no se toca
 * ni un campo, porque cualquier modificación invalidaría la firma y el
 * Document Server rechazaría la sesión.
 */
export const OnlyOfficeEditor = ({ scriptUrl, config, onGuardado }: OnlyOfficeEditorProps) => {
  // Id derivado de la versión del documento: al cambiar la `key` se pinta un
  // contenedor nuevo y el editor se vuelve a montar sobre él.
  const contenedorId = useMemo(() => `onlyoffice-${config.document.key}`, [config.document.key]);
  const editorRef = useRef<DocEditorInstancia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // El editor es un widget imperativo de terceros: se monta una vez por
  // documento (la `key` cambia con cada versión) y se destruye al salir.
  useEffect(() => {
    let cancelado = false;

    const montar = async () => {
      try {
        await cargarScriptOnlyOffice(scriptUrl);
        if (cancelado || !window.DocsAPI) return;

        editorRef.current = new window.DocsAPI.DocEditor(contenedorId, {
          ...config,
          events: {
            onDocumentReady: () => {
              if (!cancelado) setCargando(false);
            },
            // DS 9.x pide la ficha de los usuarios (comentarios/menciones) con
            // onRequestUsers c:"info" y espera un setUsers: sin respuesta, el
            // documento se queda en "Cargando" indefinidamente.
            onRequestUsers: (evento: { data?: { c?: string; id?: string[] } }) => {
              const usuario = config.editorConfig?.user;
              const ids = evento?.data?.id ?? (usuario?.id ? [usuario.id] : []);
              editorRef.current?.setUsers?.({
                c: evento?.data?.c ?? 'info',
                users: ids.map((id) => ({
                  id,
                  name: id === usuario?.id ? (usuario?.name ?? id) : id,
                })),
              });
            },
            onError: () => {
              if (!cancelado) {
                setCargando(false);
                setError('El editor de documentos ha devuelto un error.');
              }
            },
            onRequestClose: () => {
              if (!cancelado) onGuardado?.();
            },
          },
        });
      } catch {
        if (!cancelado) {
          setCargando(false);
          setError(
            'No se pudo contactar con el servidor de edición. Comprueba que ONLYOFFICE está en marcha.',
          );
        }
      }
    };

    void montar();

    return () => {
      cancelado = true;
      try {
        editorRef.current?.destroyEditor();
      } catch {
        // El editor ya se había desmontado por su cuenta: nada que limpiar.
      }
      editorRef.current = null;
    };
  }, [scriptUrl, config, contenedorId, onGuardado]);

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <FiAlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="max-w-md text-base font-medium text-gray-900">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {cargando && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-white/40">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-base font-medium text-gray-900 select-none">Abriendo el documento…</p>
        </div>
      )}
      <div id={contenedorId} className="h-full w-full" />
    </div>
  );
};
