import toast from 'react-hot-toast';

import {
  downloadContractFile,
  regenerateContractPdf,
} from '../requests/contracts.requests';
import type { Contract } from '../types/contracts.types';
import { mensajeDeApi } from './contracts.helpers';

/**
 * Descarga el PDF de un contrato y, si todavía no existe, lo genera antes.
 *
 * Seis de los ocho contratos de la demo se crearon con el servicio de
 * conversión caído y se quedaron sin PDF: el botón de descarga llamaba a una
 * URL que devolvía 404 y en pantalla no pasaba absolutamente nada — ni aviso,
 * ni error, ni spinner. Aquí el flujo es siempre visible: se genera bajo
 * demanda, se avisa mientras dura y, si falla, se dice por qué.
 *
 * @returns El contrato actualizado si hubo que regenerarlo, o `null` si no.
 */
export const descargarPdfDeContrato = async (
  contrato: Contract,
): Promise<Contract | null> => {
  let actualizado: Contract | null = null;

  const generar = async (): Promise<Contract> => {
    const aviso = toast.loading('Preparando el PDF del contrato…');
    try {
      const respuesta = await regenerateContractPdf(contrato.id);
      toast.dismiss(aviso);
      return respuesta.data;
    } catch (error) {
      toast.dismiss(aviso);
      throw error;
    }
  };

  try {
    if (!contrato.pdfPath) {
      actualizado = await generar();
    }

    try {
      await downloadContractFile(actualizado ?? contrato, 'pdf');
    } catch (error) {
      // El contrato decía tener PDF pero el fichero ya no está en disco.
      if (!esNoEncontrado(error)) throw error;
      actualizado = await generar();
      await downloadContractFile(actualizado, 'pdf');
    }

    return actualizado;
  } catch (error) {
    toast.error(
      mensajeDeApi(error, 'No se ha podido descargar el PDF del contrato'),
    );
    return actualizado;
  }
};

/** Descarga el documento Word. También avisa si el fichero no está. */
export const descargarWordDeContrato = async (
  contrato: Contract,
): Promise<void> => {
  try {
    await downloadContractFile(contrato, 'docx');
  } catch (error) {
    toast.error(
      mensajeDeApi(error, 'No se ha podido descargar el documento Word'),
    );
  }
};

/** Genera el PDF sin descargarlo (botón «Generar el PDF» de la ficha). */
export const generarPdfDeContrato = async (
  contrato: Contract,
): Promise<Contract | null> => {
  try {
    const respuesta = await regenerateContractPdf(contrato.id);
    toast.success('El PDF del contrato ya está listo');
    return respuesta.data;
  } catch (error) {
    toast.error(mensajeDeApi(error, 'No se ha podido generar el PDF'));
    return null;
  }
};

const esNoEncontrado = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 404;
