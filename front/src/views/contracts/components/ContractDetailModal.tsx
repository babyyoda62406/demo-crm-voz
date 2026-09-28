import { useState } from 'react';
import { FiCheck, FiDownload, FiRefreshCw, FiSend } from 'react-icons/fi';

import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { formatDateTime } from '../../../helpers/formatters';

import { PdfPreview } from './PdfPreview';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ContractState } from '../types/contracts.types';
import type { Contract } from '../types/contracts.types';
import {
  contractStateFlow,
  contractStateLabels,
} from '../helpers/contracts.helpers';
import {
  descargarPdfDeContrato,
  descargarWordDeContrato,
} from '../helpers/contract-pdf.helper';

interface ContractDetailModalProps {
  contrato: Contract | null;
  onClose: () => void;
  onEnviar: (contrato: Contract) => void;
  onProrroga: (contrato: Contract) => void;
  admiteProrroga: boolean;
  /** Se invoca cuando la ficha genera el PDF que faltaba. */
  onActualizado?: (contrato: Contract) => void;
}

/** Ficha del contrato: línea de tiempo del ciclo de firma y visor del PDF. */
export const ContractDetailModal = ({
  contrato,
  onClose,
  onEnviar,
  onProrroga,
  admiteProrroga,
  onActualizado,
}: ContractDetailModalProps) => {
  const [descargando, setDescargando] = useState(false);

  if (!contrato) return null;

  const descargarPdf = async () => {
    setDescargando(true);
    const actualizado = await descargarPdfDeContrato(contrato);
    if (actualizado) onActualizado?.(actualizado);
    setDescargando(false);
  };

  const fechas: Partial<Record<string, string | null | undefined>> = {
    [ContractState.BORRADOR]: contrato.createdAt,
    [ContractState.ENVIADO]: contrato.enviadoAt,
    [ContractState.VISTO]: contrato.vistoAt,
    [ContractState.FIRMADO]: contrato.firmadoAt,
  };

  const indiceActual = contractStateFlow.indexOf(contrato.estado);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={contrato.titulo}
      size="xl"
      className="!max-w-5xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ContractStatusBadge estado={contrato.estado} />
            <span className="text-sm text-gray-600">
              Referencia {contrato.referencia}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void descargarWordDeContrato(contrato)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md bg-white/40 border border-white/40 text-sm font-medium text-gray-800 hover:bg-white/55 transition-colors cursor-pointer select-none"
            >
              <FiDownload className="w-4 h-4" />
              Word
            </button>
            <button
              type="button"
              onClick={() => void descargarPdf()}
              disabled={descargando}
              title={
                contrato.pdfPath
                  ? 'Descargar el PDF'
                  : 'Se generará el PDF antes de descargarlo'
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-md bg-white/40 border border-white/40 text-sm font-medium text-gray-800 hover:bg-white/55 transition-colors cursor-pointer select-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {descargando ? (
                <span className="block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              ) : (
                <FiDownload className="w-4 h-4" />
              )}
              PDF
            </button>
            {contrato.estado !== ContractState.FIRMADO && (
              <Button onClick={() => onEnviar(contrato)} className="!px-4 !py-2">
                <span className="flex items-center gap-2">
                  <FiSend className="w-4 h-4" />
                  Enviar a firma
                </span>
              </Button>
            )}
            {admiteProrroga && (
              <Button
                variant="ghost"
                onClick={() => onProrroga(contrato)}
                className="!px-4 !py-2"
              >
                <span className="flex items-center gap-2">
                  <FiRefreshCw className="w-4 h-4" />
                  Crear prórroga
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Línea de tiempo del ciclo de firma */}
        <div className="flex flex-wrap gap-2">
          {contractStateFlow.map((estado, indice) => {
            const alcanzado = indice <= indiceActual;
            const fecha = fechas[estado];
            return (
              <div
                key={estado}
                className={`flex-1 min-w-[130px] rounded-lg border px-3 py-2 backdrop-blur-md transition-colors ${
                  alcanzado
                    ? 'bg-blue-600/12 border-blue-500/35'
                    : 'bg-white/20 border-white/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      alcanzado
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/60 text-gray-500'
                    }`}
                  >
                    {alcanzado ? <FiCheck className="w-3 h-3" /> : indice + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      alcanzado ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {contractStateLabels[estado]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {fecha ? formatDateTime(fecha) : '—'}
                </p>
              </div>
            );
          })}
        </div>

        {contrato.estado === ContractState.FIRMADO && (
          <div className="rounded-lg border border-emerald-300/60 bg-emerald-50/50 backdrop-blur-md px-4 py-3 text-sm text-emerald-900">
            Firmado por <strong>{contrato.firmanteNombre}</strong> el{' '}
            {formatDateTime(contrato.firmadoAt)}. El PDF incluye la diligencia
            de firma con la fecha, la hora y la huella del documento.
          </div>
        )}

        <PdfPreview
          contrato={contrato}
          className="h-[46vh]"
          onGenerado={(actualizado) => onActualizado?.(actualizado)}
        />
      </div>
    </Modal>
  );
};
