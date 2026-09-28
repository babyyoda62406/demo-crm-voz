import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiChevronDown,
  FiChevronRight,
  FiCopy,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFolder,
  FiFolderPlus,
  FiGrid,
  FiHardDrive,
  FiList,
  FiMove,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';

import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import { Privileges } from '../../enums/Privileges';
import { usePrivileges } from '../../hooks/usePrivileges';
import { getSuccessMessage } from '../../helpers/successHandler';

import { ContextMenu } from './components/ContextMenu';
import type { OpcionMenu } from './components/ContextMenu';
import { DocumentViewer } from './components/DocumentViewer';
import { FileGrid } from './components/FileGrid';
import type { ModificadoresClic } from './components/FileGrid';
import { FolderTree } from './components/FolderTree';
import { PromptDialog } from './components/PromptDialog';
import {
  LIMITE_TAMANO_SUBIDA,
  aplanarArbol,
  esPrevisualizable,
  formatearTamano,
  mensajeErrorDrive,
  separarExtension,
} from './documents.helpers';
import { descargarBlobEnNavegador, documentsRequests } from './documents.requests';
import type { FileDoc, FolderBreadcrumb, FolderNode } from './documents.types';

/** Objetivo del menú contextual: un documento o una carpeta del árbol. */
type ObjetivoMenu =
  | { tipo: 'fichero'; fichero: FileDoc; x: number; y: number }
  | { tipo: 'carpeta'; carpeta: FolderNode; x: number; y: number };

/** Diálogo de una sola línea: crear carpeta o renombrar un elemento. */
type DialogoNombre =
  | { modo: 'nueva-carpeta'; parentId: number | null }
  | { modo: 'renombrar-carpeta'; id: number; nombre: string }
  /** Al renombrar un documento, `nombre` es solo la parte editable. */
  | { modo: 'renombrar-fichero'; id: number; nombre: string; extension: string };

/** Elemento señalado para mover o para borrar. */
type Elemento = { tipo: 'fichero' | 'carpeta'; id: number; nombre: string };

const TAMANOS_PAGINA = [12, 24, 48, 96];

/** Ids de una carpeta y de toda su descendencia (destinos prohibidos al mover). */
const recolectarSubarbol = (nodos: FolderNode[], objetivo: number): number[] => {
  for (const nodo of nodos) {
    if (nodo.id === objetivo) return aplanarArbol([nodo]).map((opcion) => opcion.id);

    const encontrado = recolectarSubarbol(nodo.hijos, objetivo);
    if (encontrado.length > 0) return encontrado;
  }

  return [];
};

/** Nodo del árbol a partir de su id. */
const buscarNodo = (nodos: FolderNode[], objetivo: number): FolderNode | null => {
  for (const nodo of nodos) {
    if (nodo.id === objetivo) return nodo;

    const hallado = buscarNodo(nodo.hijos, objetivo);
    if (hallado) return hallado;
  }

  return null;
};

/** Documentos y subcarpetas que se lleva por delante borrar una carpeta. */
const contarContenido = (nodo: FolderNode): { documentos: number; subcarpetas: number } => {
  let documentos = nodo.totalFicheros;
  let subcarpetas = nodo.hijos.length;

  for (const hijo of nodo.hijos) {
    const dentro = contarContenido(hijo);
    documentos += dentro.documentos;
    subcarpetas += dentro.subcarpetas;
  }

  return { documentos, subcarpetas };
};

/**
 * Texto del diálogo de borrado de una carpeta.
 *
 * Dice cuánto se lleva por delante y no promete recuperarlo: el borrado es
 * lógico en la base de datos, pero en el CRM no hay papelera ni ninguna
 * pantalla desde la que devolver una carpeta borrada.
 */
const textoBorrarCarpeta = (
  nombre: string,
  contenido: { documentos: number; subcarpetas: number },
): string => {
  const partes: string[] = [];

  if (contenido.documentos > 0) {
    partes.push(`${contenido.documentos} documento${contenido.documentos === 1 ? '' : 's'}`);
  }

  if (contenido.subcarpetas > 0) {
    partes.push(`${contenido.subcarpetas} subcarpeta${contenido.subcarpetas === 1 ? '' : 's'}`);
  }

  if (partes.length === 0) {
    return `Se borrará la carpeta «${nombre}», que está vacía. No podrás recuperarla desde el CRM.`;
  }

  return `Se borrarán «${nombre}» y todo lo que contiene: ${partes.join(
    ' y ',
  )}. No podrás recuperarlo desde el CRM.`;
};

interface DocumentsViewProps {
  /** Restringe el Drive a la documentación de un cliente. */
  clienteId?: number;
  /** Restringe el Drive a la documentación de un inmueble. */
  propiedadId?: number;
  /** Título de la cabecera. Por defecto se deduce del ámbito. */
  titulo?: string;
  /** Dentro de la ficha de un cliente/inmueble: cabecera compacta y sin margen. */
  embebido?: boolean;
}

/**
 * Drive documental de CRMIA.
 *
 * Explorador de archivos completo: árbol de carpetas a la izquierda, migas de
 * pan, rejilla o lista de documentos, subida por botón y por arrastre, menú
 * contextual y apertura embebida (ONLYOFFICE para ofimática, visor nativo para
 * PDF e imágenes).
 *
 * La misma vista sirve de «Documentos del cliente»: se le pasa `clienteId` como
 * propiedad o como parámetro de consulta (`/documentos?clienteId=7`), y a partir
 * de ahí el árbol, el listado y las subidas quedan acotados a ese cliente.
 */
export const DocumentsView = ({
  clienteId,
  propiedadId,
  titulo,
  embebido = false,
}: DocumentsViewProps) => {
  const [parametros] = useSearchParams();
  const { hasPrivilege } = usePrivileges();

  const puedeSubir = hasPrivilege([Privileges.ADD_DOCUMENT]);
  const puedeEditar = hasPrivilege([Privileges.EDIT_DOCUMENT]);
  const puedeBorrar = hasPrivilege([Privileges.DELETE_DOCUMENT]);

  // El ámbito llega por propiedad (vista embebida) o por la URL (enlace desde
  // la ficha del cliente). La propiedad manda sobre el parámetro de consulta.
  // `Number(null)` es 0 y `Number('x')` es NaN: ambos caen a `undefined`.
  const aEntero = (valor: string | null): number | undefined => {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : undefined;
  };

  const alcanceCliente = clienteId ?? aEntero(parametros.get('clienteId'));
  const alcancePropiedad = propiedadId ?? aEntero(parametros.get('propiedadId'));

  const alcance = useMemo(
    () => ({ clienteId: alcanceCliente, propiedadId: alcancePropiedad }),
    [alcanceCliente, alcancePropiedad],
  );

  const esFiltrada = Boolean(alcance.clienteId || alcance.propiedadId);

  const encabezado =
    titulo ??
    (alcance.clienteId
      ? 'Documentos del cliente'
      : alcance.propiedadId
        ? 'Documentos del inmueble'
        : 'Documentos');

  const [arbol, setArbol] = useState<FolderNode[]>([]);
  const [cargandoArbol, setCargandoArbol] = useState(true);

  const [carpetaActiva, setCarpetaActiva] = useState<number | null>(null);

  const [ficheros, setFicheros] = useState<FileDoc[]>([]);
  const [cargandoFicheros, setCargandoFicheros] = useState(true);
  const [registros, setRegistros] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(24);

  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [vista, setVista] = useState<'grid' | 'lista'>('grid');
  /** Árbol de carpetas desplegado. Solo manda por debajo de `xl`. */
  const [arbolAbierto, setArbolAbierto] = useState(false);

  const [menu, setMenu] = useState<ObjetivoMenu | null>(null);
  const [visor, setVisor] = useState<FileDoc | null>(null);
  const [dialogoNombre, setDialogoNombre] = useState<DialogoNombre | null>(null);
  const [dialogoMover, setDialogoMover] = useState<Elemento | null>(null);
  const [destinoMover, setDestinoMover] = useState<string>('');
  const [aBorrar, setABorrar] = useState<Elemento | null>(null);

  // Selección múltiple: ids marcados y ancla desde la que Mayús extiende el rango.
  const [seleccionados, setSeleccionados] = useState<Set<number>>(() => new Set());
  const [ancla, setAncla] = useState<number | null>(null);
  const [moverMasa, setMoverMasa] = useState(false);
  const [destinoMasa, setDestinoMasa] = useState<string>('');
  const [borrarMasa, setBorrarMasa] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);

  const inputArchivo = useRef<HTMLInputElement>(null);
  const contadorArrastre = useRef(0);

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------

  const cargarArbol = useCallback(async () => {
    setCargandoArbol(true);
    try {
      setArbol(await documentsRequests.arbol(alcance));
    } catch (fallo) {
      toast.error(mensajeErrorDrive(fallo, 'No se ha podido cargar el árbol de carpetas'));
    } finally {
      setCargandoArbol(false);
    }
  }, [alcance]);

  const cargarFicheros = useCallback(async () => {
    setCargandoFicheros(true);
    try {
      const respuesta = await documentsRequests.listar({
        page: pagina,
        size: tamano,
        folderId: carpetaActiva ?? undefined,
        clienteId: alcance.clienteId,
        propiedadId: alcance.propiedadId,
        nombre: busquedaAplicada || undefined,
        // En la raíz solo se muestra lo que cuelga de ella; con búsqueda
        // activa se busca en todo el Drive.
        soloRaiz: carpetaActiva == null && !busquedaAplicada ? true : undefined,
      });

      setFicheros(respuesta.data);
      setRegistros(respuesta.metadata.records);
      setUltimaPagina(respuesta.metadata.lastFrame || 1);
    } catch (fallo) {
      toast.error(mensajeErrorDrive(fallo, 'No se han podido cargar los documentos'));
    } finally {
      setCargandoFicheros(false);
    }
  }, [alcance, busquedaAplicada, carpetaActiva, pagina, tamano]);

  const refrescar = useCallback(async () => {
    await Promise.all([cargarArbol(), cargarFicheros()]);
  }, [cargarArbol, cargarFicheros]);

  useEffect(() => {
    // Sincronización con la API: el estado se asienta dentro de la promesa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarArbol();
  }, [cargarArbol]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarFicheros();
  }, [cargarFicheros]);

  // Migas de pan derivadas del árbol que ya está en memoria: el camino hasta la
  // carpeta abierta. Evita una petición extra por cada clic y no se desincroniza
  // del árbol al renombrar o mover carpetas.
  const ruta = useMemo<FolderBreadcrumb[]>(() => {
    if (carpetaActiva === null) return [];

    const buscar = (nodos: FolderNode[], camino: FolderBreadcrumb[]): FolderBreadcrumb[] | null => {
      for (const nodo of nodos) {
        const recorrido = [...camino, { id: nodo.id, nombre: nodo.nombre }];
        if (nodo.id === carpetaActiva) return recorrido;

        const hallado = buscar(nodo.hijos, recorrido);
        if (hallado) return hallado;
      }

      return null;
    };

    return buscar(arbol, []) ?? [];
  }, [arbol, carpetaActiva]);

  // Búsqueda con freno: no se consulta a cada tecla.
  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
      setPagina(1);
    }, 400);

    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  const limpiarSeleccion = useCallback(() => {
    setSeleccionados((actual) => (actual.size === 0 ? actual : new Set<number>()));
    setAncla(null);
  }, []);

  // Cambiar de carpeta, de página o de tamaño renueva por completo la rejilla:
  // arrastrar la selección anterior movería documentos que ya no se ven.
  const seleccionarCarpeta = useCallback(
    (folderId: number | null) => {
      setCarpetaActiva(folderId);
      setPagina(1);
      limpiarSeleccion();
    },
    [limpiarSeleccion],
  );

  // ---------------------------------------------------------------------------
  // Subida de documentos
  // ---------------------------------------------------------------------------

  const subirArchivos = useCallback(
    async (archivos: File[]) => {
      if (archivos.length === 0) return;

      if (!puedeSubir) {
        toast.error('No tienes permiso para subir documentos');
        return;
      }

      // El tope se comprueba aquí y no solo en el servidor: subir 110 MB para
      // que el backend conteste 413 son minutos de espera y un mensaje que no
      // dice ni cuánto pesa el archivo ni cuál es el límite.
      const admitidos = archivos.filter((archivo) => {
        if (archivo.size <= LIMITE_TAMANO_SUBIDA) return true;

        toast.error(
          `«${archivo.name}» pesa ${formatearTamano(archivo.size)} y el máximo permitido son ${formatearTamano(
            LIMITE_TAMANO_SUBIDA,
          )}.`,
        );

        return false;
      });

      if (admitidos.length === 0) return;

      setSubiendo(true);
      setProgreso(0);

      let correctos = 0;

      for (const [indice, archivo] of admitidos.entries()) {
        try {
          await documentsRequests.subir(
            archivo,
            {
              folderId: carpetaActiva ?? undefined,
              clienteId: alcance.clienteId,
              propiedadId: alcance.propiedadId,
            },
            (porcentaje) => {
              // Progreso del lote completo, no el del archivo suelto.
              setProgreso(Math.round(((indice + porcentaje / 100) / admitidos.length) * 100));
            },
          );
          correctos += 1;
        } catch (fallo) {
          toast.error(mensajeErrorDrive(fallo, `No se ha podido subir «${archivo.name}»`));
        }
      }

      setSubiendo(false);
      setProgreso(0);

      if (correctos > 0) {
        toast.success(
          correctos === 1
            ? 'Documento subido correctamente'
            : `${correctos} documentos subidos correctamente`,
        );
        await refrescar();
      }
    },
    [alcance, carpetaActiva, puedeSubir, refrescar],
  );

  // ---------------------------------------------------------------------------
  // Acciones sobre documentos y carpetas
  // ---------------------------------------------------------------------------

  const descargar = useCallback(async (fichero: FileDoc) => {
    try {
      const blob = await documentsRequests.descargarBlob(fichero.id);
      descargarBlobEnNavegador(blob, fichero.nombre);
    } catch (fallo) {
      toast.error(mensajeErrorDrive(fallo, 'No se ha podido descargar el documento'));
    }
  }, []);

  const abrirFichero = useCallback(
    (fichero: FileDoc) => {
      // Lo que el CRM no sabe pintar, se lo lleva el usuario a su equipo.
      if (esPrevisualizable(fichero.nombre)) setVisor(fichero);
      else void descargar(fichero);
    },
    [descargar],
  );

  // ---------------------------------------------------------------------------
  // Selección múltiple
  // ---------------------------------------------------------------------------

  const alternarSeleccion = useCallback((fichero: FileDoc) => {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);

      if (siguiente.has(fichero.id)) siguiente.delete(fichero.id);
      else siguiente.add(fichero.id);

      return siguiente;
    });

    setAncla(fichero.id);
  }, []);

  /** Mayús+clic: añade a la selección todo lo que hay entre el ancla y el clic. */
  const extenderSeleccion = useCallback(
    (fichero: FileDoc) => {
      const hasta = ficheros.findIndex((item) => item.id === fichero.id);
      if (hasta < 0) return;

      const desde = ancla === null ? -1 : ficheros.findIndex((item) => item.id === ancla);

      // Sin ancla previa, Mayús+clic se comporta como una marca suelta.
      if (desde < 0) {
        setSeleccionados((actual) => new Set(actual).add(fichero.id));
        setAncla(fichero.id);
        return;
      }

      const [inicio, fin] = desde <= hasta ? [desde, hasta] : [hasta, desde];

      setSeleccionados((actual) => {
        const siguiente = new Set(actual);
        for (const item of ficheros.slice(inicio, fin + 1)) siguiente.add(item.id);
        return siguiente;
      });
    },
    [ancla, ficheros],
  );

  const clicFichero = useCallback(
    (fichero: FileDoc, modificadores: ModificadoresClic) => {
      if (modificadores.ctrl) {
        alternarSeleccion(fichero);
        return;
      }

      if (modificadores.shift) {
        extenderSeleccion(fichero);
        return;
      }

      limpiarSeleccion();
      abrirFichero(fichero);
    },
    [abrirFichero, alternarSeleccion, extenderSeleccion, limpiarSeleccion],
  );

  const hayDialogoAbierto =
    menu !== null ||
    visor !== null ||
    dialogoNombre !== null ||
    dialogoMover !== null ||
    aBorrar !== null ||
    moverMasa ||
    borrarMasa;

  // Escape deshace la selección, salvo si hay un diálogo delante: allí esa tecla
  // es para cerrarlo, y perder la selección al cancelar sería un fastidio.
  useEffect(() => {
    if (seleccionados.size === 0 || hayDialogoAbierto) return;

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') limpiarSeleccion();
    };

    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [hayDialogoAbierto, limpiarSeleccion, seleccionados.size]);

  const moverFichero = useCallback(
    async (fileId: number, folderId: number | null) => {
      if (!puedeEditar) {
        toast.error('No tienes permiso para mover documentos');
        return;
      }

      try {
        const respuesta = await documentsRequests.mover(fileId, folderId ?? undefined);
        toast.success(getSuccessMessage(respuesta.flag, 'Documento movido correctamente'));
        await refrescar();
      } catch (fallo) {
        toast.error(mensajeErrorDrive(fallo, 'No se ha podido mover el documento'));
      }
    },
    [puedeEditar, refrescar],
  );

  const confirmarNombre = useCallback(
    async (valor: string) => {
      if (!dialogoNombre) return;

      setGuardando(true);
      try {
        if (dialogoNombre.modo === 'nueva-carpeta') {
          const respuesta = await documentsRequests.crearCarpeta({
            nombre: valor,
            parentId: dialogoNombre.parentId ?? undefined,
            clienteId: alcance.clienteId,
            propiedadId: alcance.propiedadId,
          });
          toast.success(getSuccessMessage(respuesta.flag, 'Carpeta creada correctamente'));
        } else if (dialogoNombre.modo === 'renombrar-carpeta') {
          const respuesta = await documentsRequests.renombrarCarpeta(dialogoNombre.id, valor);
          toast.success(getSuccessMessage(respuesta.flag, 'Carpeta renombrada correctamente'));
        } else {
          const respuesta = await documentsRequests.renombrar(dialogoNombre.id, valor);
          toast.success(getSuccessMessage(respuesta.flag, 'Documento renombrado correctamente'));
        }

        setDialogoNombre(null);
        await refrescar();
      } catch (fallo) {
        toast.error(mensajeErrorDrive(fallo, 'No se ha podido guardar el cambio'));
      } finally {
        setGuardando(false);
      }
    },
    [alcance, dialogoNombre, refrescar],
  );

  const confirmarMover = useCallback(async () => {
    if (!dialogoMover) return;

    const destino = destinoMover ? Number(destinoMover) : undefined;

    setGuardando(true);
    try {
      const respuesta =
        dialogoMover.tipo === 'fichero'
          ? await documentsRequests.mover(dialogoMover.id, destino)
          : await documentsRequests.moverCarpeta(dialogoMover.id, destino);

      toast.success(
        getSuccessMessage(
          respuesta.flag,
          dialogoMover.tipo === 'fichero'
            ? 'Documento movido correctamente'
            : 'Carpeta movida correctamente',
        ),
      );

      setDialogoMover(null);
      await refrescar();
    } catch (fallo) {
      toast.error(mensajeErrorDrive(fallo, 'No se ha podido mover el elemento'));
    } finally {
      setGuardando(false);
    }
  }, [destinoMover, dialogoMover, refrescar]);

  const confirmarBorrado = useCallback(async () => {
    if (!aBorrar) return;

    setGuardando(true);
    try {
      const respuesta =
        aBorrar.tipo === 'fichero'
          ? await documentsRequests.borrar(aBorrar.id)
          : await documentsRequests.borrarCarpeta(aBorrar.id);

      toast.success(
        getSuccessMessage(
          respuesta.flag,
          aBorrar.tipo === 'fichero'
            ? 'Documento borrado correctamente'
            : 'Carpeta borrada correctamente',
        ),
      );

      // El borrado de una carpeta arrastra a sus descendientes: si la que está
      // abierta cae con ella, el explorador vuelve a la raíz en vez de quedarse
      // mirando una carpeta que ya no existe.
      if (aBorrar.tipo === 'carpeta' && carpetaActiva !== null) {
        const arrastradas = recolectarSubarbol(arbol, aBorrar.id);
        if (arrastradas.includes(carpetaActiva)) setCarpetaActiva(null);
      }

      setABorrar(null);
      await refrescar();
    } catch (fallo) {
      toast.error(mensajeErrorDrive(fallo, 'No se ha podido borrar el elemento'));
    } finally {
      setGuardando(false);
    }
  }, [aBorrar, arbol, carpetaActiva, refrescar]);

  const confirmarMoverMasa = useCallback(async () => {
    const ids = [...seleccionados];
    if (ids.length === 0) return;

    const destino = destinoMasa ? Number(destinoMasa) : null;

    setGuardando(true);
    try {
      const respuesta = await documentsRequests.moverEnMasa(ids, destino);
      const movidos = respuesta.data?.movidos ?? ids.length;
      const omitidos = respuesta.data?.omitidos ?? 0;

      toast.success(
        getSuccessMessage(
          respuesta.flag,
          movidos === 1
            ? 'Documento movido correctamente'
            : `${movidos} documentos movidos correctamente`,
        ),
      );

      if (omitidos > 0) {
        toast.error(`${omitidos} documento(s) ya no estaban disponibles y se han omitido`);
      }

      setMoverMasa(false);
      limpiarSeleccion();
      await refrescar();
    } catch (fallo) {
      toast.error(mensajeErrorDrive(fallo, 'No se han podido mover los documentos'));
    } finally {
      setGuardando(false);
    }
  }, [destinoMasa, limpiarSeleccion, refrescar, seleccionados]);

  const confirmarBorradoMasa = useCallback(async () => {
    const ids = [...seleccionados];
    if (ids.length === 0) return;

    setGuardando(true);
    try {
      // Sin endpoint de borrado en masa: se lanzan en paralelo y se cuenta lo
      // que salió bien, para que un documento con problemas no frene al resto.
      const resultados = await Promise.allSettled(
        ids.map((id) => documentsRequests.borrar(id)),
      );

      const correctos = resultados.filter((r) => r.status === 'fulfilled').length;
      const fallidos = ids.length - correctos;

      if (correctos > 0) {
        toast.success(
          correctos === 1
            ? 'Documento borrado correctamente'
            : `${correctos} documentos borrados correctamente`,
        );
      }

      if (fallidos > 0) toast.error(`No se han podido borrar ${fallidos} documento(s)`);

      setBorrarMasa(false);
      limpiarSeleccion();
      await refrescar();
    } finally {
      setGuardando(false);
    }
  }, [limpiarSeleccion, refrescar, seleccionados]);

  const duplicar = useCallback(
    async (fichero: FileDoc) => {
      try {
        const respuesta = await documentsRequests.duplicar(fichero.id);
        toast.success(getSuccessMessage(respuesta.flag, 'Documento duplicado correctamente'));
        await refrescar();
      } catch (fallo) {
        toast.error(mensajeErrorDrive(fallo, 'No se ha podido duplicar el documento'));
      }
    },
    [refrescar],
  );

  // ---------------------------------------------------------------------------
  // Menú contextual
  // ---------------------------------------------------------------------------

  const opcionesMenu = useMemo<OpcionMenu[]>(() => {
    if (!menu) return [];

    if (menu.tipo === 'fichero') {
      const opciones: OpcionMenu[] = [
        { clave: 'abrir', etiqueta: 'Abrir', Icono: FiEye },
        { clave: 'descargar', etiqueta: 'Descargar', Icono: FiDownload },
      ];

      if (puedeEditar) {
        opciones.push({
          clave: 'renombrar',
          etiqueta: 'Renombrar',
          Icono: FiEdit2,
          separadorAntes: true,
        });
        opciones.push({ clave: 'mover', etiqueta: 'Mover a…', Icono: FiMove });
      }

      if (puedeSubir) opciones.push({ clave: 'duplicar', etiqueta: 'Duplicar', Icono: FiCopy });

      if (puedeBorrar) {
        opciones.push({
          clave: 'borrar',
          etiqueta: 'Borrar',
          Icono: FiTrash2,
          peligrosa: true,
          separadorAntes: true,
        });
      }

      return opciones;
    }

    const opciones: OpcionMenu[] = [{ clave: 'abrir', etiqueta: 'Abrir', Icono: FiFolder }];

    if (puedeSubir) {
      opciones.push({ clave: 'nueva', etiqueta: 'Nueva subcarpeta', Icono: FiFolderPlus });
    }

    if (puedeEditar) {
      opciones.push({
        clave: 'renombrar',
        etiqueta: 'Renombrar',
        Icono: FiEdit2,
        separadorAntes: true,
      });
      opciones.push({ clave: 'mover', etiqueta: 'Mover a…', Icono: FiMove });
    }

    if (puedeBorrar) {
      opciones.push({
        clave: 'borrar',
        etiqueta: 'Borrar',
        Icono: FiTrash2,
        peligrosa: true,
        separadorAntes: true,
      });
    }

    return opciones;
  }, [menu, puedeBorrar, puedeEditar, puedeSubir]);

  const ejecutarAccionMenu = useCallback(
    (clave: string) => {
      if (!menu) return;

      if (menu.tipo === 'fichero') {
        const { fichero } = menu;

        if (clave === 'abrir') abrirFichero(fichero);
        else if (clave === 'descargar') void descargar(fichero);
        else if (clave === 'duplicar') void duplicar(fichero);
        else if (clave === 'renombrar') {
          const { base, extension } = separarExtension(fichero.nombre);

          setDialogoNombre({
            modo: 'renombrar-fichero',
            id: fichero.id,
            nombre: base,
            // Si un renombrado antiguo dejó el documento sin extensión, se
            // recupera la del fichero subido: así se repara desde el diálogo.
            extension: extension || separarExtension(fichero.nombreOriginal).extension,
          });
        } else if (clave === 'mover') {
          setDestinoMover(fichero.folderId ? String(fichero.folderId) : '');
          setDialogoMover({ tipo: 'fichero', id: fichero.id, nombre: fichero.nombre });
        } else if (clave === 'borrar') {
          setABorrar({ tipo: 'fichero', id: fichero.id, nombre: fichero.nombre });
        }

        return;
      }

      const { carpeta } = menu;

      if (clave === 'abrir') seleccionarCarpeta(carpeta.id);
      else if (clave === 'nueva') setDialogoNombre({ modo: 'nueva-carpeta', parentId: carpeta.id });
      else if (clave === 'renombrar') {
        setDialogoNombre({ modo: 'renombrar-carpeta', id: carpeta.id, nombre: carpeta.nombre });
      } else if (clave === 'mover') {
        setDestinoMover(carpeta.parentId ? String(carpeta.parentId) : '');
        setDialogoMover({ tipo: 'carpeta', id: carpeta.id, nombre: carpeta.nombre });
      } else if (clave === 'borrar') {
        setABorrar({ tipo: 'carpeta', id: carpeta.id, nombre: carpeta.nombre });
      }
    },
    [abrirFichero, descargar, duplicar, menu, seleccionarCarpeta],
  );

  // ---------------------------------------------------------------------------
  // Arrastre de archivos del escritorio
  // ---------------------------------------------------------------------------

  /** `true` solo si lo que se arrastra son archivos reales, no una tarjeta del Drive. */
  const traeArchivos = (evento: React.DragEvent): boolean =>
    evento.dataTransfer.types.includes('Files');

  const alEntrarArrastre = (evento: React.DragEvent) => {
    if (!traeArchivos(evento)) return;
    contadorArrastre.current += 1;
    setArrastrando(true);
  };

  const alSalirArrastre = (evento: React.DragEvent) => {
    if (!traeArchivos(evento)) return;
    contadorArrastre.current -= 1;
    if (contadorArrastre.current <= 0) {
      contadorArrastre.current = 0;
      setArrastrando(false);
    }
  };

  const alSoltarArchivos = (evento: React.DragEvent) => {
    if (!traeArchivos(evento)) return;
    evento.preventDefault();
    contadorArrastre.current = 0;
    setArrastrando(false);
    void subirArchivos(Array.from(evento.dataTransfer.files));
  };

  const alSalirDelVisor = useCallback(() => {
    void cargarFicheros();
  }, [cargarFicheros]);

  // ---------------------------------------------------------------------------
  // Destinos disponibles al mover
  // ---------------------------------------------------------------------------

  const carpetasPlanas = useMemo(() => aplanarArbol(arbol), [arbol]);

  const opcionesDestino = useMemo(() => {
    if (!dialogoMover || dialogoMover.tipo !== 'carpeta') return carpetasPlanas;

    // Una carpeta no puede mudarse dentro de sí misma ni de sus descendientes.
    const prohibidos = new Set(recolectarSubarbol(arbol, dialogoMover.id));
    return carpetasPlanas.filter((opcion) => !prohibidos.has(opcion.id));
  }, [arbol, carpetasPlanas, dialogoMover]);

  // Lo que hay dentro de la carpeta señalada para borrar, contado sobre el
  // árbol que ya está en memoria: el diálogo dice el número exacto.
  const contenidoABorrar = useMemo(() => {
    if (aBorrar?.tipo !== 'carpeta') return { documentos: 0, subcarpetas: 0 };

    const nodo = buscarNodo(arbol, aBorrar.id);
    return nodo ? contarContenido(nodo) : { documentos: 0, subcarpetas: 0 };
  }, [aBorrar, arbol]);

  // Al renombrar un documento se edita solo el nombre: la extensión se muestra
  // aparte y vuelve a pegarse al guardar.
  const nombreDialogo = useMemo(() => {
    if (!dialogoNombre || !('nombre' in dialogoNombre)) return { base: '', extension: '' };

    return {
      base: dialogoNombre.nombre,
      extension: dialogoNombre.modo === 'renombrar-fichero' ? dialogoNombre.extension : '',
    };
  }, [dialogoNombre]);

  const etiquetaRaiz = alcance.clienteId
    ? 'Documentación del cliente'
    : alcance.propiedadId
      ? 'Documentación del inmueble'
      : 'Todo el Drive';

  // ---------------------------------------------------------------------------
  // Interfaz
  // ---------------------------------------------------------------------------

  return (
    <div className={embebido ? 'w-full' : 'h-full overflow-y-auto p-4 md:p-6'}>
      <div className={embebido ? 'space-y-4' : 'mx-auto max-w-[1600px] space-y-4 md:space-y-5'}>
        <header
          className={`rounded-xl border border-white/30 backdrop-blur-xl bg-white/20 shadow-lg ${
            embebido ? 'p-4' : 'p-4 md:p-6'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
            <div className="flex min-w-0 items-start gap-3 md:gap-4">
              <div className="rounded-xl border border-white/30 backdrop-blur-md bg-white/40 p-2.5 md:p-3 text-blue-600">
                <FiFolder className={embebido ? 'h-6 w-6' : 'h-6 w-6 md:h-7 md:w-7'} />
              </div>
              <div className="min-w-0">
                <h1
                  className={`font-bold text-gray-900 drop-shadow-sm break-words ${
                    embebido ? 'text-xl' : 'text-xl md:text-3xl'
                  }`}
                >
                  {encabezado}
                </h1>
                <p className="hidden sm:block mt-1 text-gray-700">
                  {esFiltrada
                    ? 'Notas simples, planos, presupuestos y contratos vinculados a esta ficha.'
                    : 'Archivo digital de la agencia: crea carpetas, sube documentación y edítala sin salir del CRM.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void refrescar()}
                title="Actualizar"
                aria-label="Actualizar"
                className="flex min-h-11 min-w-11 cursor-pointer select-none items-center justify-center rounded-lg border border-white/30 backdrop-blur-md bg-white/40 text-gray-800 transition-colors hover:bg-white/60"
              >
                <FiRefreshCw className={`h-5 w-5 ${cargandoFicheros ? 'animate-spin' : ''}`} />
              </button>

              {puedeSubir && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => setDialogoNombre({ modo: 'nueva-carpeta', parentId: carpetaActiva })}
                    className="flex items-center gap-2 px-3 py-2.5 md:px-4"
                  >
                    <FiFolderPlus className="h-4 w-4" />
                    Nueva<span className="hidden md:inline"> carpeta</span>
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => inputArchivo.current?.click()}
                    isLoading={subiendo}
                    className="flex items-center gap-2 px-3 py-2.5 md:px-4"
                  >
                    <FiUploadCloud className="h-4 w-4" />
                    {subiendo ? `Subiendo… ${progreso}%` : 'Subir'}
                    {!subiendo && <span className="hidden md:inline">archivos</span>}
                  </Button>
                </>
              )}
            </div>
          </div>

          <input
            ref={inputArchivo}
            type="file"
            multiple
            hidden
            onChange={(evento) => {
              const seleccion = evento.target.files ? Array.from(evento.target.files) : [];
              // Se vacía el input para poder volver a elegir el mismo archivo.
              // Copiar la selección antes es obligatorio: al limpiarlo, el
              // `FileList` del evento se queda sin elementos.
              evento.target.value = '';
              void subirArchivos(seleccion);
            }}
          />
        </header>

        {/* Dos paneles solo a partir de `xl`: a 1024 px el árbol dejaba las
            tarjetas en 460 px y partía los nombres a mitad de palabra. */}
        <div className="grid min-h-[30rem] grid-cols-1 gap-4 xl:grid-cols-[17rem_1fr]">
          <div className="xl:contents">
            {/*
              En móvil el árbol se despliega a demanda: si va siempre abierto,
              hay que pasar todas las carpetas antes de ver un solo documento.
            */}
            <button
              type="button"
              onClick={() => setArbolAbierto((abierto) => !abierto)}
              aria-expanded={arbolAbierto}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/30 backdrop-blur-xl bg-white/25 px-4 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-white/40 cursor-pointer select-none xl:hidden"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FiFolder className="h-4 w-4 flex-shrink-0 text-blue-600" />
                <span className="truncate">
                  {ruta.length > 0 ? ruta[ruta.length - 1].nombre : etiquetaRaiz}
                </span>
              </span>
              <FiChevronDown
                className={`h-4 w-4 flex-shrink-0 transition-transform ${
                  arbolAbierto ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              className={`${
                arbolAbierto ? 'max-h-[50vh] overflow-y-auto' : 'hidden'
              } xl:block xl:max-h-none xl:overflow-visible xl:h-full`}
            >
              <FolderTree
                nodos={arbol}
                carpetaActiva={carpetaActiva}
                cargando={cargandoArbol}
                etiquetaRaiz={etiquetaRaiz}
                onSeleccionar={(folderId) => {
                  seleccionarCarpeta(folderId);
                  setArbolAbierto(false);
                }}
                onNuevaCarpeta={(parentId) => setDialogoNombre({ modo: 'nueva-carpeta', parentId })}
                onMenuCarpeta={(carpeta, x, y) => setMenu({ tipo: 'carpeta', carpeta, x, y })}
                onSoltarFichero={(fileId, folderId) => void moverFichero(fileId, folderId)}
              />
            </div>
          </div>

          <section
            onDragEnter={alEntrarArrastre}
            onDragOver={(evento) => {
              if (!traeArchivos(evento)) return;
              evento.preventDefault();
              evento.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={alSalirArrastre}
            onDrop={alSoltarArchivos}
            className={`relative flex flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur-xl transition-colors ${
              arrastrando
                ? 'border-blue-400/70 bg-blue-50/40 ring-2 ring-blue-500/40'
                : 'border-white/30 bg-white/20'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/30 px-4 py-3">
              <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
                <button
                  type="button"
                  onClick={() => seleccionarCarpeta(null)}
                  className={`flex cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 py-1 font-semibold transition-colors hover:bg-white/50 ${
                    carpetaActiva === null ? 'text-blue-800' : 'text-gray-700'
                  }`}
                >
                  <FiHardDrive className="h-4 w-4" />
                  {etiquetaRaiz}
                </button>

                {ruta.map((miga, indice) => (
                  <span key={miga.id} className="flex min-w-0 items-center gap-1">
                    <FiChevronRight className="h-4 w-4 flex-shrink-0 text-gray-500" />
                    <button
                      type="button"
                      onClick={() => seleccionarCarpeta(miga.id)}
                      className={`max-w-[12rem] cursor-pointer select-none truncate rounded-lg px-2 py-1 transition-colors hover:bg-white/50 ${
                        indice === ruta.length - 1
                          ? 'font-semibold text-blue-800'
                          : 'font-medium text-gray-700'
                      }`}
                    >
                      {miga.nombre}
                    </button>
                  </span>
                ))}
              </nav>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:flex-none">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(evento) => {
                      setBusqueda(evento.target.value);
                      limpiarSeleccion();
                    }}
                    placeholder="Buscar documentos…"
                    aria-label="Buscar documentos"
                    className="w-full min-h-11 rounded-lg border border-white/30 backdrop-blur-md bg-white/40 pl-9 pr-8 text-base text-gray-900 placeholder-gray-600 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 sm:w-56"
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      aria-label="Limpiar la búsqueda"
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-gray-600 hover:bg-white/60 hover:text-gray-900"
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-shrink-0 overflow-hidden rounded-lg border border-white/30 backdrop-blur-md bg-white/40">
                  <button
                    type="button"
                    onClick={() => setVista('grid')}
                    title="Ver en cuadrícula"
                    aria-label="Ver en cuadrícula"
                    className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-colors sm:min-h-9 sm:min-w-9 ${
                      vista === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    <FiGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setVista('lista')}
                    title="Ver en lista"
                    aria-label="Ver en lista"
                    className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center transition-colors sm:min-h-9 sm:min-w-9 ${
                      vista === 'lista'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    <FiList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {subiendo && (
              <div className="h-1 w-full bg-white/40">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-200"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            )}

            <div
              onClick={(evento) => {
                if (evento.target === evento.currentTarget) limpiarSeleccion();
              }}
              className="flex-1 overflow-y-auto p-4"
            >
              <FileGrid
                ficheros={ficheros}
                vista={vista}
                cargando={cargandoFicheros}
                seleccionados={seleccionados}
                onAbrir={abrirFichero}
                onClicFichero={clicFichero}
                onAlternarSeleccion={alternarSeleccion}
                onLimpiarSeleccion={limpiarSeleccion}
                onMenu={(fichero, x, y) => setMenu({ tipo: 'fichero', fichero, x, y })}
                busqueda={busquedaAplicada}
                onLimpiarBusqueda={() => setBusqueda('')}
              />
            </div>

            {registros > 0 && (
              <Pagination
                currentPage={pagina}
                totalPages={ultimaPagina}
                pageSize={tamano}
                totalRecords={registros}
                pageSizeOptions={TAMANOS_PAGINA}
                onPageChange={(nueva) => {
                  setPagina(nueva);
                  limpiarSeleccion();
                }}
                onPageSizeChange={(nuevo) => {
                  setTamano(nuevo);
                  setPagina(1);
                  limpiarSeleccion();
                }}
              />
            )}

            {arrastrando && (
              <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 backdrop-blur-sm bg-blue-50/50">
                <FiUploadCloud className="h-12 w-12 text-blue-600" />
                <p className="select-none text-lg font-semibold text-blue-900">
                  Suelta los archivos para subirlos aquí
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {seleccionados.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/40 backdrop-blur-xl bg-white/60 px-3 py-2.5 shadow-2xl md:bottom-6 md:gap-3 md:px-4 md:py-3">
          <span className="select-none whitespace-nowrap text-sm font-bold text-gray-900">
            {seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}
          </span>

          <span className="h-6 w-px bg-gray-400/40" />

          {puedeEditar && (
            <Button
              variant="primary"
              onClick={() => {
                setDestinoMasa(carpetaActiva ? String(carpetaActiva) : '');
                setMoverMasa(true);
              }}
              className="flex items-center gap-2 px-4 py-2"
            >
              <FiMove className="h-4 w-4" />
              Mover
            </Button>
          )}

          {puedeBorrar && (
            <Button
              variant="danger"
              onClick={() => setBorrarMasa(true)}
              className="flex items-center gap-2 px-4 py-2"
            >
              <FiTrash2 className="h-4 w-4" />
              Borrar
            </Button>
          )}

          <button
            type="button"
            onClick={limpiarSeleccion}
            title="Deshacer la selección"
            aria-label="Deshacer la selección"
            className="cursor-pointer select-none rounded-lg border border-white/40 backdrop-blur-md bg-white/50 p-2 text-gray-700 transition-colors hover:bg-white/80 hover:text-gray-900"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          opciones={opcionesMenu}
          onSeleccionar={ejecutarAccionMenu}
          onCerrar={() => setMenu(null)}
        />
      )}

      {visor && (
        <DocumentViewer
          fichero={visor}
          onClose={() => setVisor(null)}
          onCerradoTrasEdicion={alSalirDelVisor}
        />
      )}

      <PromptDialog
        isOpen={dialogoNombre !== null}
        titulo={
          dialogoNombre?.modo === 'nueva-carpeta'
            ? 'Nueva carpeta'
            : dialogoNombre?.modo === 'renombrar-carpeta'
              ? 'Renombrar la carpeta'
              : 'Renombrar el documento'
        }
        etiqueta={dialogoNombre?.modo === 'nueva-carpeta' ? 'Nombre de la carpeta' : 'Nuevo nombre'}
        valorInicial={nombreDialogo.base}
        extensionFija={nombreDialogo.extension}
        textoConfirmar={dialogoNombre?.modo === 'nueva-carpeta' ? 'Crear' : 'Guardar'}
        cargando={guardando}
        onConfirmar={(valor) => void confirmarNombre(valor)}
        onCerrar={() => setDialogoNombre(null)}
      />

      <Modal
        isOpen={dialogoMover !== null}
        onClose={() => setDialogoMover(null)}
        title={dialogoMover?.tipo === 'carpeta' ? 'Mover la carpeta' : 'Mover el documento'}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-base font-medium text-gray-900">
            Elige la carpeta de destino para «{dialogoMover?.nombre}».
          </p>

          <div>
            <label
              htmlFor="destino-mover"
              className="mb-2 block text-base font-semibold text-gray-900"
            >
              Carpeta de destino
            </label>
            <select
              id="destino-mover"
              value={destinoMover}
              onChange={(evento) => setDestinoMover(evento.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-300 backdrop-blur-md bg-white/50 px-4 py-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">{etiquetaRaiz} (raíz)</option>
              {opcionesDestino.map((opcion) => (
                <option key={opcion.id} value={String(opcion.id)}>
                  {`${'  '.repeat(opcion.nivel)}${opcion.nivel > 0 ? '└ ' : ''}${opcion.nombre}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialogoMover(null)} disabled={guardando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void confirmarMover()} isLoading={guardando}>
              Mover
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={moverMasa}
        onClose={() => setMoverMasa(false)}
        title={`Mover ${seleccionados.size} documento${seleccionados.size === 1 ? '' : 's'}`}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-base font-medium text-gray-900">
            Elige la carpeta de destino para los documentos seleccionados.
          </p>

          <div>
            <label
              htmlFor="destino-mover-masa"
              className="mb-2 block text-base font-semibold text-gray-900"
            >
              Carpeta de destino
            </label>
            <select
              id="destino-mover-masa"
              value={destinoMasa}
              onChange={(evento) => setDestinoMasa(evento.target.value)}
              className="w-full cursor-pointer rounded-xl border border-gray-300 backdrop-blur-md bg-white/50 px-4 py-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">{etiquetaRaiz} (raíz)</option>
              {carpetasPlanas.map((opcion) => (
                <option key={opcion.id} value={String(opcion.id)}>
                  {`${'  '.repeat(opcion.nivel)}${opcion.nivel > 0 ? '└ ' : ''}${opcion.nombre}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setMoverMasa(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => void confirmarMoverMasa()}
              isLoading={guardando}
            >
              Mover
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={borrarMasa}
        onClose={() => setBorrarMasa(false)}
        onConfirm={() => void confirmarBorradoMasa()}
        isLoading={guardando}
        variant="danger"
        title={`Borrar ${seleccionados.size} documento${seleccionados.size === 1 ? '' : 's'}`}
        message={
          seleccionados.size === 1
            ? '¿Seguro que quieres borrar el documento seleccionado? No podrás recuperarlo desde el CRM.'
            : `¿Seguro que quieres borrar los ${seleccionados.size} documentos seleccionados? No podrás recuperarlos desde el CRM.`
        }
        confirmText="Borrar"
      />

      <ConfirmDialog
        isOpen={aBorrar !== null}
        onClose={() => setABorrar(null)}
        onConfirm={() => void confirmarBorrado()}
        isLoading={guardando}
        variant="danger"
        title={aBorrar?.tipo === 'carpeta' ? 'Borrar la carpeta' : 'Borrar el documento'}
        message={
          aBorrar?.tipo === 'carpeta'
            ? textoBorrarCarpeta(aBorrar.nombre, contenidoABorrar)
            : `¿Seguro que quieres borrar «${aBorrar?.nombre}»? No podrás recuperarlo desde el CRM.`
        }
        confirmText="Borrar"
      />
    </div>
  );
};
