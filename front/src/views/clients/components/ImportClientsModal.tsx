import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { FiAlertCircle, FiCheckCircle, FiFile, FiUpload } from 'react-icons/fi';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { useClientActions } from '../hooks/useClients';
import {
  BusinessLine,
  BusinessLineLabels,
  BusinessLineList,
  ClientType,
  ClientTypeLabels,
  ClientTypeList,
} from '../enums/clientEnums';
import type { ImportClientsSummary } from '../requests/clients.requests';

interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

const EXTENSIONES_ADMITIDAS = ['.csv', '.xlsx', '.xls', '.ods'];

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/40 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 text-gray-900 text-base';

const labelClasses = 'block text-base font-semibold text-gray-900 mb-2';

/** Comprueba la extensión antes de subir para no gastar un viaje al servidor. */
const tieneExtensionValida = (nombre: string): boolean =>
  EXTENSIONES_ADMITIDAS.some((extension) => nombre.toLowerCase().endsWith(extension));

/** Importación masiva de clientes desde un CSV o un libro de Excel. */
export const ImportClientsModal = ({
  isOpen,
  onClose,
  onImported,
}: ImportClientsModalProps) => {
  const { importClients, isSaving } = useClientActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [lineaNegocio, setLineaNegocio] = useState<BusinessLine>(BusinessLine.PSI);
  const [tipo, setTipo] = useState<ClientType>(ClientType.INVERSOR);
  const [actualizarExistentes, setActualizarExistentes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ImportClientsSummary | null>(null);

  const [abiertoPrevio, setAbiertoPrevio] = useState(isOpen);
  if (abiertoPrevio !== isOpen) {
    setAbiertoPrevio(isOpen);
    if (!isOpen) {
      // Al cerrar se limpia todo para que la próxima importación empiece de cero.
      setFile(null);
      setError('');
      setSummary(null);
      setIsDragging(false);
    }
  }

  const seleccionarFichero = (seleccionado: File | undefined) => {
    if (!seleccionado) return;

    if (!tieneExtensionValida(seleccionado.name)) {
      setError(`Formato no admitido. Usa un fichero ${EXTENSIONES_ADMITIDAS.join(', ')}.`);
      setFile(null);
      return;
    }

    setError('');
    setSummary(null);
    setFile(seleccionado);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    seleccionarFichero(event.target.files?.[0]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    seleccionarFichero(event.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    if (!file) {
      setError('Selecciona un fichero para importar.');
      return;
    }

    const resultado = await importClients(file, {
      lineaNegocio,
      tipo,
      actualizarExistentes,
    });

    if (resultado) {
      setSummary(resultado);
      onImported();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importar clientes desde CSV o Excel"
      size="lg"
    >
      <div className="space-y-5">
        {/* --- Zona de subida --- */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer select-none ${
            isDragging
              ? 'border-blue-500 bg-blue-50/40'
              : 'border-white/50 backdrop-blur-md bg-white/25 hover:bg-white/35'
          }`}
        >
          <FiUpload className="w-8 h-8 text-blue-600" />
          <p className="text-base font-semibold text-gray-900">
            Arrastra el fichero aquí o haz clic para elegirlo
          </p>
          <p className="text-sm text-gray-600">
            Formatos admitidos: {EXTENSIONES_ADMITIDAS.join(', ')} (máx. 5 MB)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={EXTENSIONES_ADMITIDAS.join(',')}
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        {file && (
          <div className="flex items-center gap-2 rounded-lg border border-white/30 backdrop-blur-md bg-white/35 px-4 py-2.5">
            <FiFile className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{file.name}</span>
            <span className="text-xs text-gray-600 ml-auto whitespace-nowrap">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-600 font-medium">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* --- Valores por defecto --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses} htmlFor="import-linea">
              Línea de negocio por defecto
            </label>
            <select
              id="import-linea"
              value={lineaNegocio}
              onChange={(event) => setLineaNegocio(event.target.value as BusinessLine)}
              className={`${controlClasses} cursor-pointer`}
            >
              {BusinessLineList.map((linea) => (
                <option key={linea} value={linea}>
                  {BusinessLineLabels[linea]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses} htmlFor="import-tipo">
              Tipo de cliente por defecto
            </label>
            <select
              id="import-tipo"
              value={tipo}
              onChange={(event) => setTipo(event.target.value as ClientType)}
              className={`${controlClasses} cursor-pointer`}
            >
              {ClientTypeList.map((valor) => (
                <option key={valor} value={valor}>
                  {ClientTypeLabels[valor]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={actualizarExistentes}
            onChange={(event) => setActualizarExistentes(event.target.checked)}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
          <span className="text-sm text-gray-900">
            Actualizar los clientes cuyo correo ya exista (si no, se omiten)
          </span>
        </label>

        <details className="rounded-lg border border-white/30 backdrop-blur-md bg-white/25 px-4 py-3">
          <summary className="text-sm font-semibold text-gray-900 cursor-pointer select-none">
            ¿Qué columnas reconoce?
          </summary>
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            Nombre, apellidos, email, teléfono, documento, tipo, línea de negocio,
            etapa, presupuesto (mínimo, máximo o un rango tipo «120.000 - 180.000»),
            zonas de interés, tipo de operación, origen y notas. Da igual el orden,
            las mayúsculas y las tildes; las columnas que no reconozca se ignoran.
            La única obligatoria es el <strong>nombre</strong>.
          </p>
        </details>

        {/* --- Resultado --- */}
        {summary && (
          <div className="space-y-3 rounded-lg border border-white/30 backdrop-blur-md bg-white/35 px-4 py-3">
            <p className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <FiCheckCircle className="w-5 h-5 text-emerald-600" />
              Importación finalizada
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Filas', value: summary.totalFilas, color: 'text-gray-900' },
                { label: 'Creados', value: summary.creados, color: 'text-emerald-700' },
                {
                  label: 'Actualizados',
                  value: summary.actualizados,
                  color: 'text-blue-700',
                },
                { label: 'Omitidos', value: summary.omitidos, color: 'text-amber-700' },
              ].map((dato) => (
                <div
                  key={dato.label}
                  className="rounded-lg backdrop-blur-sm bg-white/40 border border-white/30 px-3 py-2 text-center"
                >
                  <p className={`text-xl font-bold ${dato.color}`}>{dato.value}</p>
                  <p className="text-xs text-gray-600 select-none">{dato.label}</p>
                </div>
              ))}
            </div>

            {summary.errores.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                <p className="text-sm font-semibold text-gray-800">Filas no importadas</p>
                {summary.errores.map((fallo) => (
                  <p key={fallo.fila} className="text-sm text-gray-700">
                    <span className="font-medium">Fila {fallo.fila}:</span> {fallo.motivo}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-white/30">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            {summary ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            isLoading={isSaving}
            disabled={!file}
            className="flex items-center gap-2"
          >
            <FiUpload className="w-4 h-4" />
            Importar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
