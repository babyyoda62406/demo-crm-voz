import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiArrowRight,
  FiBookmark,
  FiCheck,
  FiCopy,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiHome,
  FiLink,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUser,
  FiUserPlus,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';

import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { getSuccessMessage } from '../../../helpers/successHandler';

import { DynamicContractForm } from './DynamicContractForm';
import { PdfPreview } from './PdfPreview';
import { SearchSelect } from './SearchSelect';
import type { SearchOption } from './SearchSelect';
import {
  buscarClientes,
  buscarPropiedades,
  createContract,
  sendContract,
  updateContract,
} from '../requests/contracts.requests';
import type {
  ClienteOpcion,
  Contract,
  ContractFormValues,
  ContractTemplate,
  PropiedadOpcion,
} from '../types/contracts.types';
import {
  camposIncompletos,
  mensajeDeApi,
  precargaDesdeCliente,
  precargaDesdePropiedad,
  valoresIniciales,
} from '../helpers/contracts.helpers';
import {
  descargarPdfDeContrato,
  descargarWordDeContrato as descargarDocx,
} from '../helpers/contract-pdf.helper';

const iconosPlantilla: Record<string, IconType> = {
  FiHome,
  FiRefreshCw,
  FiUserPlus,
  FiSearch,
  FiBookmark,
  FiFileText,
};

type Paso = 'plantilla' | 'datos' | 'previsualizacion';

const pasos: { id: Paso; titulo: string }[] = [
  { id: 'plantilla', titulo: 'Plantilla' },
  { id: 'datos', titulo: 'Datos' },
  { id: 'previsualizacion', titulo: 'Revisar y enviar' },
];

interface ContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  plantillas: ContractTemplate[];
  /** Se invoca tras generar o enviar, para refrescar el listado. */
  onCompletado: () => void;
  /** Datos con los que precargar el formulario (prórrogas, cliente elegido). */
  precarga?: Record<string, unknown>;
  /** Plantilla preseleccionada por clave. */
  plantillaInicial?: string;
}

/**
 * Asistente de creación de contratos:
 * 1) elegir plantilla · 2) vincular cliente e inmueble y rellenar el formulario
 * dinámico · 3) previsualizar el PDF y generar el enlace de firma.
 */
export const ContractWizard = ({
  isOpen,
  onClose,
  plantillas,
  onCompletado,
  precarga,
  plantillaInicial,
}: ContractWizardProps) => {
  const [paso, setPaso] = useState<Paso>('plantilla');
  const [plantilla, setPlantilla] = useState<ContractTemplate | null>(null);
  const [valores, setValores] = useState<ContractFormValues>({});
  const [titulo, setTitulo] = useState('');
  const [cliente, setCliente] = useState<ClienteOpcion | null>(null);
  const [propiedad, setPropiedad] = useState<PropiedadOpcion | null>(null);
  const [contrato, setContrato] = useState<Contract | null>(null);
  const [destinatario, setDestinatario] = useState('');
  const [enlace, setEnlace] = useState<string | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [descartando, setDescartando] = useState(false);

  // Copia de los valores con los que se abrió el formulario: sirve para saber
  // si hay algo que perder al cerrar el asistente.
  const valoresDePartida = useRef('');
  const bannerError = useRef<HTMLDivElement>(null);
  const clientesEncontrados = useRef<ClienteOpcion[]>([]);
  const propiedadesEncontradas = useRef<PropiedadOpcion[]>([]);

  const plantillasActivas = useMemo(
    () => plantillas.filter((p) => p.activo),
    [plantillas],
  );

  // Reinicio completo cada vez que se abre el asistente.
  useEffect(() => {
    if (!isOpen) return;

    const inicial = plantillaInicial
      ? (plantillas.find((p) => p.key === plantillaInicial) ?? null)
      : null;
    const arranque = inicial ? valoresIniciales(inicial, precarga) : {};

    valoresDePartida.current = JSON.stringify(arranque);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlantilla(inicial);
    setValores(arranque);
    setPaso(inicial ? 'datos' : 'plantilla');
    setTitulo('');
    setCliente(null);
    setPropiedad(null);
    setContrato(null);
    setDestinatario('');
    setEnlace(null);
    setFaltantes([]);
    setDescartando(false);
  }, [isOpen, plantillaInicial, plantillas, precarga]);

  const elegirPlantilla = (elegida: ContractTemplate) => {
    const arranque = valoresIniciales(elegida, precarga);
    valoresDePartida.current = JSON.stringify(arranque);
    setPlantilla(elegida);
    setValores(arranque);
    setFaltantes([]);
    setPaso('datos');
  };

  // -------------------------------------------------------------------------
  // Vinculación con el CRM
  // -------------------------------------------------------------------------

  const buscarOpcionesDeCliente = useCallback(
    async (texto: string): Promise<SearchOption[]> => {
      const encontrados = await buscarClientes(texto);
      clientesEncontrados.current = encontrados;
      return encontrados.map((c) => ({
        id: c.id,
        titulo: c.nombre,
        detalle: [c.documento, c.email, c.telefono].filter(Boolean).join(' · '),
      }));
    },
    [],
  );

  const buscarOpcionesDePropiedad = useCallback(
    async (texto: string): Promise<SearchOption[]> => {
      const encontradas = await buscarPropiedades(texto);
      propiedadesEncontradas.current = encontradas;
      return encontradas.map((p) => ({
        id: p.id,
        titulo: p.direccion || p.titulo || `Inmueble ${p.id}`,
        detalle: [p.referencia, p.poblacion].filter(Boolean).join(' · '),
      }));
    },
    [],
  );

  const elegirCliente = (opcion: SearchOption | null) => {
    if (!opcion) {
      setCliente(null);
      return;
    }

    const elegido =
      clientesEncontrados.current.find((c) => c.id === opcion.id) ?? null;
    setCliente(elegido);

    if (elegido && plantilla) {
      setValores((previos) => ({
        ...previos,
        ...precargaDesdeCliente(plantilla, elegido),
      }));
    }
  };

  const elegirPropiedad = (opcion: SearchOption | null) => {
    if (!opcion) {
      setPropiedad(null);
      return;
    }

    const elegida =
      propiedadesEncontradas.current.find((p) => p.id === opcion.id) ?? null;
    setPropiedad(elegida);

    if (elegida && plantilla) {
      setValores((previos) => ({
        ...previos,
        ...precargaDesdePropiedad(plantilla, elegida),
      }));
    }
  };

  const direccionDePropiedad = (elegida: PropiedadOpcion): string =>
    [elegida.direccion, elegida.poblacion].filter(Boolean).join(', ');

  // -------------------------------------------------------------------------
  // Generación y envío
  // -------------------------------------------------------------------------

  const generar = async () => {
    if (!plantilla) return;

    const incompletos = camposIncompletos(plantilla, valores);
    if (incompletos.length > 0) {
      setFaltantes(incompletos);
      // Un único aviso corto: el detalle está en el recuadro del formulario.
      toast.error(
        incompletos.length === 1
          ? 'Falta 1 dato obligatorio'
          : `Faltan ${incompletos.length} datos obligatorios`,
      );
      requestAnimationFrame(() =>
        bannerError.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        }),
      );
      return;
    }

    const vinculos = {
      clienteId: cliente?.id,
      clienteNombre: cliente?.nombre,
      propiedadId: propiedad?.id,
      propiedadDireccion: propiedad
        ? direccionDePropiedad(propiedad)
        : undefined,
    };

    setGuardando(true);
    try {
      const respuesta = contrato
        ? await updateContract(contrato.id, {
            datos: valores,
            titulo: titulo.trim() || undefined,
            ...vinculos,
          })
        : await createContract({
            templateKey: plantilla.key,
            titulo: titulo.trim() || undefined,
            datos: valores,
            ...vinculos,
          });

      setContrato(respuesta.data);
      setFaltantes([]);
      setPaso('previsualizacion');
      toast.success(getSuccessMessage(respuesta.flag, respuesta.message));
      onCompletado();
    } catch (error) {
      toast.error(mensajeDeApi(error, 'No se pudo generar el contrato'));
    } finally {
      setGuardando(false);
    }
  };

  const enviar = async () => {
    if (!contrato) return;

    const correo = destinatario.trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
      toast.error('Ese correo no es válido. Revísalo o déjalo vacío.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await sendContract(contrato.id, {
        destinatarioEmail: correo || undefined,
      });
      setContrato(respuesta.data.contrato);
      setEnlace(respuesta.data.enlaceAplicacion);
      toast.success('Enlace de firma generado');
      onCompletado();
    } catch (error) {
      toast.error(mensajeDeApi(error, 'No se pudo generar el enlace de firma'));
    } finally {
      setEnviando(false);
    }
  };

  const copiarEnlace = async () => {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success('Enlace copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar el enlace');
    }
  };

  const enlaceWhatsapp = (): string =>
    `https://wa.me/?text=${encodeURIComponent(
      `Hola, te envío el contrato ${contrato?.referencia ?? ''} para su firma. Puedes leerlo y firmarlo desde este enlace: ${enlace ?? ''}`,
    )}`;

  const descargarPdf = async () => {
    if (!contrato) return;
    setDescargando(true);
    const actualizado = await descargarPdfDeContrato(contrato);
    if (actualizado) {
      setContrato(actualizado);
      onCompletado();
    }
    setDescargando(false);
  };

  // -------------------------------------------------------------------------
  // Cierre con datos sin guardar
  // -------------------------------------------------------------------------

  /** ¿Hay trabajo escrito que todavía no se ha convertido en un contrato? */
  const hayCambiosSinGuardar = (): boolean =>
    paso === 'datos' &&
    !contrato &&
    (JSON.stringify(valores) !== valoresDePartida.current ||
      titulo.trim() !== '' ||
      Boolean(cliente) ||
      Boolean(propiedad));

  /**
   * El formulario de alquiler tiene 32 campos: un clic en el fondo o un Escape
   * no pueden llevárselos por delante sin preguntar.
   */
  const solicitarCierre = () => {
    if (descartando) return;
    if (hayCambiosSinGuardar()) {
      setDescartando(true);
      return;
    }
    onClose();
  };

  const indicePaso = pasos.findIndex((p) => p.id === paso);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={solicitarCierre}
        title="Nuevo contrato"
        size="xl"
        className="!max-w-5xl"
      >
        {/* Indicador de pasos */}
        <div className="flex items-center gap-1 sm:gap-2 mb-4 sm:mb-5 select-none">
          {pasos.map((p, indice) => (
            <div key={p.id} className="flex min-w-0 items-center gap-1 sm:gap-2 flex-1">
              <div
                className={`flex min-w-0 items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-colors ${
                  indice <= indicePaso
                    ? 'bg-blue-600/15 text-blue-800 border-blue-500/40'
                    : 'bg-white/25 text-gray-600 border-white/30'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                    indice < indicePaso
                      ? 'bg-blue-600 text-white'
                      : indice === indicePaso
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/60 text-gray-600'
                  }`}
                >
                  {indice < indicePaso ? (
                    <FiCheck className="w-3 h-3" />
                  ) : (
                    indice + 1
                  )}
                </span>
                {/* En móvil solo cabe el título del paso en curso */}
                <span className={`truncate ${indice === indicePaso ? '' : 'hidden sm:inline'}`}>
                  {p.titulo}
                </span>
              </div>
              {indice < pasos.length - 1 && (
                <div
                  className={`h-px flex-1 ${
                    indice < indicePaso ? 'bg-blue-500/50' : 'bg-white/40'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Paso 1: elegir plantilla */}
        {paso === 'plantilla' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plantillasActivas.length === 0 && (
              <p className="col-span-full text-sm text-gray-600 py-8 text-center">
                No hay plantillas disponibles. Comprueba que los documentos
                existen en <code>back/assets/templates</code>.
              </p>
            )}
            {plantillasActivas.map((p) => {
              const Icono = iconosPlantilla[p.icono ?? 'FiFileText'] ?? FiFileText;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => elegirPlantilla(p)}
                  className="text-left p-4 rounded-xl backdrop-blur-md bg-white/30 border border-white/40 hover:bg-white/45 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg backdrop-blur-md bg-white/50 border border-white/40 text-blue-600 group-hover:scale-105 transition-transform">
                      <Icono className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{p.nombre}</p>
                      {p.categoria && (
                        <span className="inline-block mt-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                          {p.categoria}
                        </span>
                      )}
                      <p className="mt-1.5 text-sm text-gray-700 line-clamp-3">
                        {p.descripcion}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Paso 2: vinculación y formulario dinámico */}
        {paso === 'datos' && plantilla && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[240px]">
                <label
                  htmlFor="titulo-contrato"
                  className="block text-sm font-semibold text-gray-900 mb-1.5"
                >
                  Título del contrato
                </label>
                <input
                  id="titulo-contrato"
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder={`${plantilla.nombre} · se genera solo si lo dejas vacío`}
                  className="w-full px-3 py-2 backdrop-blur-md bg-white/50 border border-white/40 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <button
                type="button"
                onClick={() => setPaso('plantilla')}
                className="px-3 py-2 rounded-lg backdrop-blur-md bg-white/40 border border-white/40 text-sm font-medium text-gray-800 hover:bg-white/55 transition-colors cursor-pointer select-none"
              >
                Cambiar plantilla
              </button>
            </div>

            {/* Vinculación con el CRM: es lo que hace que el contrato salga con
                nombre en el listado y que se pueda facturar desde él.
                `relative z-30`: el formulario dinámico que va debajo lleva
                backdrop-blur, que crea contexto de apilado propio y tapaba los
                desplegables de los buscadores. */}
            <section className="relative z-30 backdrop-blur-md bg-white/20 rounded-xl border border-white/30 p-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 select-none">
                Cliente e inmueble
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                <SearchSelect
                  id="contrato-cliente"
                  label="Cliente del CRM"
                  placeholder="Busca por nombre, correo o teléfono"
                  icono={FiUser}
                  seleccionado={
                    cliente
                      ? {
                          id: cliente.id,
                          titulo: cliente.nombre,
                          detalle:
                            [cliente.documento, cliente.email]
                              .filter(Boolean)
                              .join(' · ') || undefined,
                        }
                      : null
                  }
                  buscar={buscarOpcionesDeCliente}
                  onSeleccionar={elegirCliente}
                  ayuda="Al elegirlo se rellenan sus datos en el documento y el contrato queda vinculado a su ficha."
                  vacio="Ningún cliente coincide"
                />
                <SearchSelect
                  id="contrato-propiedad"
                  label="Inmueble de la cartera"
                  placeholder="Busca por dirección o referencia"
                  icono={FiHome}
                  seleccionado={
                    propiedad
                      ? {
                          id: propiedad.id,
                          titulo: direccionDePropiedad(propiedad),
                          detalle: propiedad.referencia ?? undefined,
                        }
                      : null
                  }
                  buscar={buscarOpcionesDePropiedad}
                  onSeleccionar={elegirPropiedad}
                  ayuda="Rellena la dirección del inmueble en el documento."
                  vacio="Ningún inmueble coincide"
                />
              </div>
            </section>

            {faltantes.length > 0 && (
              <div
                ref={bannerError}
                className="rounded-lg border border-red-300/60 bg-red-50/50 backdrop-blur-md px-4 py-3 text-sm text-red-800"
              >
                <strong>Faltan datos obligatorios:</strong> {faltantes.join(', ')}
              </div>
            )}

            <div className="max-h-[52vh] overflow-y-auto pr-1">
              <DynamicContractForm
                plantilla={plantilla}
                valores={valores}
                onChange={setValores}
                camposConError={faltantes}
              />
            </div>

            {/* Barra de acciones anclada: con el aviso de campos obligatorios,
                «Generar documento» se salía por debajo de la pantalla. */}
            <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-1 flex justify-between gap-3 bg-white/45 backdrop-blur-md border-t border-white/40">
              <Button
                variant="ghost"
                onClick={() => setPaso('plantilla')}
                className="!px-4 !py-2"
              >
                <span className="flex items-center gap-2">
                  <FiArrowLeft className="w-4 h-4" />
                  Atrás
                </span>
              </Button>
              <Button
                onClick={generar}
                isLoading={guardando}
                className="!px-5 !py-2"
              >
                <span className="flex items-center gap-2">
                  Generar documento
                  <FiArrowRight className="w-4 h-4" />
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Paso 3: previsualización y enlace de firma */}
        {paso === 'previsualizacion' && contrato && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{contrato.titulo}</p>
                <p className="text-sm text-gray-600">
                  Referencia {contrato.referencia}
                  {contrato.clienteNombre ? ` · ${contrato.clienteNombre}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void descargarDocx(contrato)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md bg-white/40 border border-white/40 text-sm font-medium text-gray-800 hover:bg-white/55 transition-colors cursor-pointer select-none"
                >
                  <FiDownload className="w-4 h-4" />
                  Word
                </button>
                <button
                  type="button"
                  onClick={() => void descargarPdf()}
                  disabled={descargando}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md bg-white/40 border border-white/40 text-sm font-medium text-gray-800 hover:bg-white/55 transition-colors cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {descargando ? (
                    <span className="block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                  ) : (
                    <FiDownload className="w-4 h-4" />
                  )}
                  PDF
                </button>
              </div>
            </div>

            <PdfPreview
              contrato={contrato}
              className="h-[46vh]"
              onGenerado={(actualizado) => {
                setContrato(actualizado);
                onCompletado();
              }}
            />

            {enlace ? (
              <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/50 backdrop-blur-md p-4 space-y-3">
                <p className="font-semibold text-emerald-900 flex items-center gap-2">
                  <FiCheck className="w-4 h-4" />
                  Enlace de firma generado
                </p>
                <p className="text-sm text-emerald-900/80">
                  Cópialo y envíaselo al cliente por WhatsApp o por correo. Al
                  abrirlo, el contrato pasará a «Visto»; al firmarlo, a
                  «Firmado».
                </p>
                <code className="block text-xs bg-white/60 border border-white/50 rounded-lg px-3 py-2 text-gray-800 break-all">
                  {enlace}
                </code>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => void copiarEnlace()}
                    className="!px-4 !py-2"
                  >
                    <span className="flex items-center gap-2">
                      <FiCopy className="w-4 h-4" />
                      Copiar enlace
                    </span>
                  </Button>
                  <a
                    href={enlaceWhatsapp()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors select-none shadow-sm"
                  >
                    <FiMessageCircle className="w-4 h-4" />
                    Enviar por WhatsApp
                  </a>
                  <a
                    href={enlace}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/30 border border-white/30 text-sm font-semibold text-gray-900 hover:bg-white/45 transition-colors select-none"
                  >
                    <FiExternalLink className="w-4 h-4" />
                    Abrir como el cliente
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/40 bg-white/25 backdrop-blur-md p-4 space-y-3">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <FiLink className="w-4 h-4" />
                  Enlace de firma
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[240px]">
                    <label
                      htmlFor="destinatario"
                      className="block text-sm font-semibold text-gray-900 mb-1.5"
                    >
                      Correo del destinatario (opcional)
                    </label>
                    <input
                      id="destinatario"
                      type="email"
                      value={destinatario}
                      onChange={(e) => setDestinatario(e.target.value)}
                      placeholder="administracion@example.com"
                      className="w-full px-3 py-2 backdrop-blur-md bg-white/50 border border-white/40 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <p className="mt-1.5 text-xs text-gray-600">
                      Se guarda como referencia del envío. El enlace lo compartes
                      tú por WhatsApp o correo.
                    </p>
                  </div>
                  <Button
                    onClick={enviar}
                    isLoading={enviando}
                    className="!px-5 !py-2"
                  >
                    <span className="flex items-center gap-2">
                      <FiSend className="w-4 h-4" />
                      Generar enlace de firma
                    </span>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-1">
              <Button
                variant="ghost"
                onClick={() => setPaso('datos')}
                className="!px-4 !py-2"
              >
                <span className="flex items-center gap-2">
                  <FiArrowLeft className="w-4 h-4" />
                  Corregir datos
                </span>
              </Button>
              <Button variant="secondary" onClick={onClose} className="!px-5 !py-2">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={descartando}
        onClose={() => setDescartando(false)}
        onConfirm={() => {
          setDescartando(false);
          onClose();
        }}
        title="¿Descartar el borrador?"
        message="Se perderán los datos que has introducido en el asistente. Esta acción no se puede deshacer."
        confirmText="Descartar"
        cancelText="Seguir editando"
        variant="warning"
      />
    </>
  );
};
