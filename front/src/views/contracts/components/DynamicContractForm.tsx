import { FiPlus, FiTrash2, FiInfo } from 'react-icons/fi';
import { ContractFieldType } from '../types/contracts.types';
import type {
  ContractFormValues,
  ContractListRow,
  ContractTemplate,
  ContractTemplateField,
} from '../types/contracts.types';
import {
  agruparCampos,
  filaVacia,
  inputTypeFor,
} from '../helpers/contracts.helpers';

const controlClasses =
  'w-full px-3 py-2 backdrop-blur-md bg-white/50 border border-white/40 rounded-lg text-gray-900 placeholder-gray-500 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 hover:border-white/60';

interface DynamicContractFormProps {
  plantilla: ContractTemplate;
  valores: ContractFormValues;
  onChange: (valores: ContractFormValues) => void;
  camposConError?: string[];
}

/**
 * Formulario generado a partir de la definición de campos de la plantilla.
 * Agrupa los campos por bloque y resuelve los campos de tipo LISTA (bucles
 * `{#ocupantes}` de la plantilla .docx) con filas añadibles.
 */
export const DynamicContractForm = ({
  plantilla,
  valores,
  onChange,
  camposConError = [],
}: DynamicContractFormProps) => {
  const grupos = agruparCampos(plantilla.campos);

  const setCampo = (nombre: string, valor: string | ContractListRow[]) => {
    onChange({ ...valores, [nombre]: valor });
  };

  const filasDe = (campo: ContractTemplateField): ContractListRow[] => {
    const valor = valores[campo.name];
    return Array.isArray(valor) ? valor : [];
  };

  const setFila = (
    campo: ContractTemplateField,
    indice: number,
    subcampo: string,
    valor: string,
  ) => {
    const filas = filasDe(campo).map((fila, i) =>
      i === indice ? { ...fila, [subcampo]: valor } : fila,
    );
    setCampo(campo.name, filas);
  };

  const anadirFila = (campo: ContractTemplateField) => {
    setCampo(campo.name, [...filasDe(campo), filaVacia(campo)]);
  };

  const quitarFila = (campo: ContractTemplateField, indice: number) => {
    const filas = filasDe(campo).filter((_, i) => i !== indice);
    setCampo(campo.name, filas.length > 0 ? filas : [filaVacia(campo)]);
  };

  const renderCampo = (campo: ContractTemplateField) => {
    const conError = camposConError.includes(campo.label);
    const errorClasses = conError
      ? 'border-red-500/70 focus:ring-red-500/40'
      : '';

    // ---- Listas repetibles (ocupantes) -----------------------------------
    if (campo.type === ContractFieldType.LISTA) {
      const filas = filasDe(campo);
      // El tope lo declara la plantilla (p. ej. 4 ocupantes, que es lo que
      // admite la cláusula cuarta del contrato de alquiler).
      const alTope = Boolean(campo.maxRows) && filas.length >= campo.maxRows!;

      return (
        <div key={campo.name} className="col-span-full">
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-semibold text-gray-900">
              {campo.label}
              {campo.required && <span className="text-red-600 ml-1">*</span>}
              {campo.maxRows && (
                <span className="ml-2 text-xs font-medium text-gray-600">
                  {filas.length} de {campo.maxRows}
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={() => anadirFila(campo)}
              disabled={alTope}
              title={
                alTope
                  ? `Este documento admite como máximo ${campo.maxRows}`
                  : undefined
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-md bg-white/40 border border-white/40 text-sm font-medium text-blue-700 hover:bg-white/60 transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/40"
            >
              <FiPlus className="w-4 h-4" />
              Añadir
            </button>
          </div>

          <div className="space-y-2">
            {filas.map((fila, indice) => (
              <div
                key={indice}
                className="flex flex-wrap items-end gap-2 p-3 rounded-lg backdrop-blur-md bg-white/25 border border-white/30"
              >
                {(campo.subFields ?? []).map((sub) => (
                  <div key={sub.name} className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {sub.label}
                    </label>
                    <input
                      type="text"
                      value={fila[sub.name] ?? ''}
                      onChange={(e) =>
                        setFila(campo, indice, sub.name, e.target.value)
                      }
                      className={controlClasses}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => quitarFila(campo, indice)}
                  aria-label={`Quitar ${campo.label} ${indice + 1}`}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer select-none"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {campo.help && (
            <p className="mt-2 text-xs text-gray-600 flex items-center gap-1.5">
              <FiInfo className="w-3.5 h-3.5 flex-none" />
              {campo.help}
            </p>
          )}
        </div>
      );
    }

    const valor = String(valores[campo.name] ?? '');
    const anchoClases = campo.span === 2 ? 'col-span-full' : '';

    // ---- Campos simples ---------------------------------------------------
    return (
      <div key={campo.name} className={anchoClases}>
        <label
          htmlFor={`campo-${campo.name}`}
          className="block text-sm font-semibold text-gray-900 mb-1.5"
        >
          {campo.label}
          {campo.required && <span className="text-red-600 ml-1">*</span>}
        </label>

        {campo.type === ContractFieldType.TEXTO_LARGO ? (
          <textarea
            id={`campo-${campo.name}`}
            value={valor}
            rows={2}
            placeholder={campo.placeholder}
            onChange={(e) => setCampo(campo.name, e.target.value)}
            className={`${controlClasses} ${errorClasses} resize-y`}
          />
        ) : campo.type === ContractFieldType.FECHA ? (
          <input
            id={`campo-${campo.name}`}
            type="text"
            value={valor}
            placeholder={campo.placeholder ?? 'dd/mm/aaaa'}
            onChange={(e) => setCampo(campo.name, e.target.value)}
            className={`${controlClasses} ${errorClasses}`}
          />
        ) : (
          <input
            id={`campo-${campo.name}`}
            type={inputTypeFor(campo.type)}
            value={valor}
            placeholder={campo.placeholder}
            onChange={(e) => setCampo(campo.name, e.target.value)}
            className={`${controlClasses} ${errorClasses}`}
          />
        )}

        {campo.help && (
          <p className="mt-1 text-xs text-gray-600">{campo.help}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {grupos.map(({ grupo, campos }) => (
        <section
          key={grupo}
          className="backdrop-blur-md bg-white/20 rounded-xl border border-white/30 p-4"
        >
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3 select-none">
            {grupo}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            {campos.map(renderCampo)}
          </div>
        </section>
      ))}
    </div>
  );
};
