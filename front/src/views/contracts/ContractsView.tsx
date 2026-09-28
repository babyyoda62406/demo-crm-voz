import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiDownload,
  FiEye,
  FiFilePlus,
  FiFileText,
  FiRefreshCw,
  FiSend,
  FiTrash2,
} from 'react-icons/fi';

import { Table } from '../../components/Table';
import type { Column } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { FilterBar } from '../../components/FilterBar';
import type { FilterValue } from '../../components/FilterBar';
import { CollapsibleFilters } from '../../components/CollapsibleFilters';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { getErrorMessage } from '../../helpers/errorHandler';
import { formatDate } from '../../helpers/formatters';

import { ContractStatusBadge } from './components/ContractStatusBadge';
import { ContractWizard } from './components/ContractWizard';
import { SendContractModal } from './components/SendContractModal';
import { ProrrogaModal } from './components/ProrrogaModal';
import { ContractDetailModal } from './components/ContractDetailModal';
import {
  deleteContract,
  getContracts,
  getContractTemplates,
} from './requests/contracts.requests';
import { ContractState } from './types/contracts.types';
import type {
  Contract,
  ContractStateValue,
  ContractTemplate,
} from './types/contracts.types';
import { contractStateLabels, mensajeDeApi } from './helpers/contracts.helpers';
import {
  descargarPdfDeContrato,
  descargarWordDeContrato,
} from './helpers/contract-pdf.helper';

const ESTADOS_FILTRO = Object.values(ContractState).map((estado) => ({
  value: estado,
  label: contractStateLabels[estado],
}));

/** Botón de acción de una fila: 44 px con el dedo, compacto con el ratón. */
const CLASE_ACCION =
  'inline-flex min-h-11 min-w-11 md:min-h-9 md:min-w-9 items-center justify-center rounded-lg transition-colors cursor-pointer';

/**
 * Vista principal del dominio Contratos: listado con filtros, asistente de
 * creación, envío a firma y creación de prórrogas.
 */
export const ContractsView = () => {
  const [contratos, setContratos] = useState<Contract[]>([]);
  const [plantillas, setPlantillas] = useState<ContractTemplate[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(10);
  const [total, setTotal] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(1);

  const [filtros, setFiltros] = useState<Record<string, FilterValue>>({
    search: '',
    estado: '',
    templateKey: '',
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState<
    Record<string, FilterValue>
  >({ search: '', estado: '', templateKey: '' });

  const [asistenteAbierto, setAsistenteAbierto] = useState(false);
  const [detalle, setDetalle] = useState<Contract | null>(null);
  const [aEnviar, setAEnviar] = useState<Contract | null>(null);
  const [aProrrogar, setAProrrogar] = useState<Contract | null>(null);
  const [aBorrar, setABorrar] = useState<Contract | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState<number | null>(null);

  const plantillasPorClave = useMemo(() => {
    const mapa: Record<string, ContractTemplate> = {};
    plantillas.forEach((p) => {
      mapa[p.key] = p;
    });
    return mapa;
  }, [plantillas]);

  const cargarContratos = useCallback(async () => {
    setCargando(true);
    try {
      const respuesta = await getContracts({
        page: pagina,
        size: tamano,
        search: (filtrosAplicados.search as string) || undefined,
        estado: (filtrosAplicados.estado as ContractStateValue) || '',
        templateKey: (filtrosAplicados.templateKey as string) || undefined,
      });
      setContratos(respuesta.data ?? []);
      setTotal(respuesta.metadata?.records ?? 0);
      setUltimaPagina(respuesta.metadata?.lastFrame ?? 1);
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron cargar los contratos'));
    } finally {
      setCargando(false);
    }
  }, [pagina, tamano, filtrosAplicados]);

  useEffect(() => {
    // Sincronización con la API: el estado se actualiza dentro de la promesa.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargarContratos();
  }, [cargarContratos]);

  useEffect(() => {
    const cargarPlantillas = async () => {
      try {
        setPlantillas(await getContractTemplates());
      } catch (error) {
        toast.error(
          getErrorMessage(error, 'No se pudieron cargar las plantillas'),
        );
      }
    };
    void cargarPlantillas();
  }, []);

  const admiteProrroga = (contrato: Contract): boolean =>
    Boolean(plantillasPorClave[contrato.templateKey]?.admiteProrroga);

  const confirmarBorrado = async () => {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await deleteContract(aBorrar.id);
      toast.success('Contrato eliminado correctamente');
      setABorrar(null);
      void cargarContratos();
    } catch (error) {
      toast.error(mensajeDeApi(error, 'No se pudo eliminar el contrato'));
    } finally {
      setBorrando(false);
    }
  };

  /**
   * Descarga el PDF y, si el contrato todavía no lo tiene, lo genera antes.
   * El botón muestra el progreso: antes un clic aquí no producía nada visible.
   */
  const descargarPdf = async (contrato: Contract) => {
    setDescargandoPdf(contrato.id);
    const actualizado = await descargarPdfDeContrato(contrato);
    if (actualizado) void cargarContratos();
    setDescargandoPdf(null);
  };

  /**
   * Botonera de un contrato. La comparten la tabla de escritorio y la tarjeta
   * de móvil, donde los botones crecen a 44 px para poder pulsarlos con el dedo.
   */
  const acciones = (contrato: Contract) => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        title="Ver contrato"
        aria-label="Ver contrato"
        onClick={() => setDetalle(contrato)}
        className={`${CLASE_ACCION} text-blue-700 hover:bg-white/45`}
      >
        <FiEye className="w-5 h-5 md:w-4 md:h-4" />
      </button>
      <button
        type="button"
        title={contrato.pdfPath ? 'Descargar PDF' : 'Generar y descargar el PDF'}
        aria-label="Descargar PDF"
        disabled={descargandoPdf === contrato.id}
        onClick={() => void descargarPdf(contrato)}
        className={`${CLASE_ACCION} text-gray-700 hover:bg-white/45 disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {descargandoPdf === contrato.id ? (
          <span className="block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        ) : (
          <FiDownload className="w-5 h-5 md:w-4 md:h-4" />
        )}
      </button>
      <button
        type="button"
        title="Descargar Word"
        aria-label="Descargar Word"
        onClick={() => void descargarWordDeContrato(contrato)}
        className={`${CLASE_ACCION} text-gray-700 hover:bg-white/45`}
      >
        <FiFileText className="w-5 h-5 md:w-4 md:h-4" />
      </button>
      {contrato.estado !== ContractState.FIRMADO && (
        <button
          type="button"
          title="Enviar a firma"
          aria-label="Enviar a firma"
          onClick={() => setAEnviar(contrato)}
          className={`${CLASE_ACCION} text-blue-700 hover:bg-white/45`}
        >
          <FiSend className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      )}
      {admiteProrroga(contrato) && (
        <button
          type="button"
          title="Crear prórroga"
          aria-label="Crear prórroga"
          onClick={() => setAProrrogar(contrato)}
          className={`${CLASE_ACCION} text-emerald-700 hover:bg-white/45`}
        >
          <FiRefreshCw className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      )}
      {/* Un contrato firmado es la prueba de la operación: no se borra.
          El backend también lo bloquea. */}
      {contrato.estado !== ContractState.FIRMADO && (
        <button
          type="button"
          title="Eliminar"
          aria-label="Eliminar"
          onClick={() => setABorrar(contrato)}
          className={`${CLASE_ACCION} text-red-600 hover:bg-red-500/10`}
        >
          <FiTrash2 className="w-5 h-5 md:w-4 md:h-4" />
        </button>
      )}
    </div>
  );

  /** Fila del listado en móvil: la tabla de seis columnas no cabe en 390 px. */
  const tarjetaMovil = (contrato: Contract) => (
    <div className="space-y-3">
      <div onClick={() => setDetalle(contrato)} className="cursor-pointer space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 break-words">{contrato.titulo}</p>
          <ContractStatusBadge estado={contrato.estado} />
        </div>
        <p className="text-sm text-gray-700">
          {contrato.referencia} ·{' '}
          {plantillasPorClave[contrato.templateKey]?.nombre ?? contrato.templateKey}
        </p>
        <p className="text-sm text-gray-600">
          {contrato.clienteNombre || 'Sin cliente'} · {formatDate(contrato.createdAt)}
        </p>
      </div>
      {acciones(contrato)}
    </div>
  );

  const columnas: Column<Contract>[] = [
    {
      key: 'referencia',
      header: 'Referencia',
      className: 'font-semibold whitespace-nowrap',
    },
    {
      key: 'titulo',
      header: 'Contrato',
      render: (contrato) => (
        <div className="min-w-[220px]">
          <p className="font-medium text-gray-900">{contrato.titulo}</p>
          <p className="text-xs text-gray-600">
            {plantillasPorClave[contrato.templateKey]?.nombre ??
              contrato.templateKey}
          </p>
        </div>
      ),
    },
    {
      key: 'clienteNombre',
      header: 'Cliente',
      render: (contrato) => (
        <span className="text-gray-800">{contrato.clienteNombre || '—'}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (contrato) => <ContractStatusBadge estado={contrato.estado} />,
    },
    {
      key: 'createdAt',
      header: 'Creado',
      className: 'whitespace-nowrap',
      render: (contrato) => formatDate(contrato.createdAt),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      className: 'whitespace-nowrap',
      render: acciones,
    },
  ];

  const resumen = useMemo(() => {
    const cuenta = (estado: ContractStateValue) =>
      contratos.filter((c) => c.estado === estado).length;
    return [
      { estado: ContractState.BORRADOR, total: cuenta(ContractState.BORRADOR) },
      { estado: ContractState.ENVIADO, total: cuenta(ContractState.ENVIADO) },
      { estado: ContractState.VISTO, total: cuenta(ContractState.VISTO) },
      { estado: ContractState.FIRMADO, total: cuenta(ContractState.FIRMADO) },
    ];
  }, [contratos]);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-5">
        {/* Cabecera */}
        <div className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="p-2.5 md:p-3 rounded-xl backdrop-blur-md bg-white/40 border border-white/30 text-blue-600">
                <FiFileText className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 drop-shadow-sm">
                  Contratos
                </h1>
                <p className="hidden sm:block mt-1 text-gray-700">
                  Alquileres temporales, encargos PSI, reservas, anexos y
                  prórrogas generados desde las plantillas reales.
                </p>
              </div>
            </div>
            <Button onClick={() => setAsistenteAbierto(true)} className="px-4 py-2.5 md:px-6 md:py-3">
              <span className="flex items-center gap-2">
                <FiFilePlus className="w-5 h-5" />
                Nuevo<span className="hidden sm:inline"> contrato</span>
              </span>
            </Button>
          </div>

          <div className="mt-4 md:mt-5 grid grid-cols-4 gap-2 md:gap-3">
            {resumen.map(({ estado, total: cuenta }) => (
              <div
                key={estado}
                className="rounded-lg backdrop-blur-md bg-white/25 border border-white/30 px-2 py-2 md:px-4 md:py-3"
              >
                <p className="text-lg md:text-2xl font-bold text-gray-900">{cuenta}</p>
                <p className="text-xs md:text-sm text-gray-700">
                  {contractStateLabels[estado]}
                  <span className="hidden md:inline text-xs text-gray-500"> · en esta página</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <CollapsibleFilters
          activos={Object.values(filtros).filter((valor) => valor !== '' && valor !== undefined).length}
        >
        <FilterBar
          fields={[
            {
              key: 'search',
              label: 'Buscar',
              type: 'text',
              placeholder: 'Referencia, título, cliente o dirección',
            },
            {
              key: 'estado',
              label: 'Estado',
              type: 'select',
              options: ESTADOS_FILTRO,
            },
            {
              key: 'templateKey',
              label: 'Plantilla',
              type: 'select',
              options: plantillas.map((p) => ({ value: p.key, label: p.nombre })),
            },
          ]}
          values={filtros}
          onChange={(clave, valor) =>
            setFiltros((previos) => ({ ...previos, [clave]: valor }))
          }
          onSearch={() => {
            setPagina(1);
            setFiltrosAplicados({ ...filtros });
          }}
          onClear={() => {
            const vacios = { search: '', estado: '', templateKey: '' };
            setFiltros(vacios);
            setFiltrosAplicados(vacios);
            setPagina(1);
          }}
        />
        </CollapsibleFilters>

        {/* Listado */}
        <div className="backdrop-blur-xl bg-white/20 rounded-xl shadow-lg border border-white/30 overflow-hidden">
          <Table
            data={contratos}
            columns={columnas}
            isLoading={cargando}
            renderMobileCard={tarjetaMovil}
            emptyMessage="Todavía no hay contratos. Crea el primero con «Nuevo contrato»."
          />
          {total > 0 && (
            <Pagination
              currentPage={pagina}
              totalPages={ultimaPagina}
              pageSize={tamano}
              totalRecords={total}
              onPageChange={setPagina}
              onPageSizeChange={(nuevo) => {
                setTamano(nuevo);
                setPagina(1);
              }}
            />
          )}
        </div>
      </div>

      {/* Asistente de creación */}
      <ContractWizard
        isOpen={asistenteAbierto}
        onClose={() => setAsistenteAbierto(false)}
        plantillas={plantillas}
        onCompletado={() => void cargarContratos()}
      />

      {/* Ficha del contrato */}
      <ContractDetailModal
        contrato={detalle}
        onClose={() => setDetalle(null)}
        onEnviar={(contrato) => {
          setDetalle(null);
          setAEnviar(contrato);
        }}
        onProrroga={(contrato) => {
          setDetalle(null);
          setAProrrogar(contrato);
        }}
        admiteProrroga={detalle ? admiteProrroga(detalle) : false}
        onActualizado={(actualizado) => {
          setDetalle(actualizado);
          void cargarContratos();
        }}
      />

      {/* Envío a firma */}
      <SendContractModal
        contrato={aEnviar}
        onClose={() => setAEnviar(null)}
        onEnviado={() => void cargarContratos()}
      />

      {/* Prórroga */}
      <ProrrogaModal
        contrato={aProrrogar}
        onClose={() => setAProrrogar(null)}
        onCreada={(prorroga) => {
          setAProrrogar(null);
          void cargarContratos();
          setDetalle(prorroga);
        }}
      />

      {/* Confirmación de borrado */}
      <ConfirmDialog
        isOpen={Boolean(aBorrar)}
        onClose={() => setABorrar(null)}
        onConfirm={() => void confirmarBorrado()}
        title="Eliminar contrato"
        message={`¿Seguro que quieres eliminar «${aBorrar?.titulo ?? ''}»? Se borrarán también sus documentos generados.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={borrando}
      />
    </div>
  );
};
