import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { getEnvConfig } from '../env/envs';

/**
 * Conversion de documentos mediante Gotenberg (contenedor `gotenberg/gotenberg`,
 * ver `docker-compose.dev.yml`). Se usan tres rutas:
 *
 *   POST {GOTENBERG_URL}/forms/libreoffice/convert      .docx -> .pdf
 *   POST {GOTENBERG_URL}/forms/chromium/convert/html    .html -> .pdf
 *   POST {GOTENBERG_URL}/forms/pdfengines/merge         .pdf + .pdf -> .pdf
 *
 * Las dos ultimas son las que permiten estampar la diligencia de firma al final
 * del contrato sin anadir ninguna dependencia de manipulacion de PDF.
 *
 * El servicio NUNCA lanza: si Gotenberg no responde devuelve `null` y quien
 * llama decide. Asi una demo sin Gotenberg sigue funcionando.
 */
@Injectable()
export class PdfConverterService {
  private readonly logger = new Logger(PdfConverterService.name);
  private readonly env = getEnvConfig();

  /** `true` si hay una URL de Gotenberg configurada. */
  get isConfigured(): boolean {
    return Boolean(this.env.GOTENBERG_URL);
  }

  /**
   * Convierte un .docx en PDF.
   * @param docx Contenido del documento de Word.
   * @param nombreFichero Nombre con extension .docx (Gotenberg lo usa para
   *        decidir el conversor).
   * @returns El PDF, o `null` si la conversion no fue posible.
   */
  async docxToPdf(docx: Buffer, nombreFichero: string): Promise<Buffer | null> {
    const form = new FormData();
    form.append(
      'files',
      new Blob([new Uint8Array(docx)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      nombreFichero,
    );

    return await this.enviar(
      'forms/libreoffice/convert',
      form,
      `convertir "${nombreFichero}" a PDF`,
    );
  }

  /**
   * Compone un PDF a partir de un documento HTML autonomo (sin recursos
   * externos). Se usa para la diligencia de firma electronica.
   */
  async htmlToPdf(html: string): Promise<Buffer | null> {
    const form = new FormData();
    // Gotenberg exige que el fichero principal se llame `index.html`.
    form.append('files', new Blob([html], { type: 'text/html' }), 'index.html');

    return await this.enviar(
      'forms/chromium/convert/html',
      form,
      'componer la página de firma en PDF',
    );
  }

  /**
   * Une varios PDF en uno solo. Gotenberg ordena por nombre de fichero, asi que
   * se numeran para conservar el orden en el que llegan.
   */
  async mergePdfs(documentos: Buffer[]): Promise<Buffer | null> {
    if (documentos.length === 0) return null;
    if (documentos.length === 1) return documentos[0];

    const form = new FormData();
    documentos.forEach((documento, indice) => {
      form.append(
        'files',
        new Blob([new Uint8Array(documento)], { type: 'application/pdf' }),
        `${String(indice).padStart(4, '0')}.pdf`,
      );
    });

    return await this.enviar(
      'forms/pdfengines/merge',
      form,
      'unir los PDF del contrato',
    );
  }

  /**
   * Escribe las propiedades del PDF (autor, titulo...).
   *
   * Hace falta despues de unir documentos: la union descarta los metadatos que
   * venian del .docx y el PDF firmado se quedaba sin autor.
   */
  async setPdfMetadata(
    pdf: Buffer,
    metadatos: Record<string, string>,
  ): Promise<Buffer | null> {
    const form = new FormData();
    form.append(
      'files',
      new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }),
      'documento.pdf',
    );
    form.append('metadata', JSON.stringify(metadatos));

    return await this.enviar(
      'forms/pdfengines/metadata/write',
      form,
      'fijar los metadatos del PDF',
    );
  }

  /**
   * Llamada comun a Gotenberg. Devuelve `null` (y deja traza) ante cualquier
   * fallo: ninguna de las conversiones debe tumbar la peticion del usuario.
   */
  private async enviar(
    ruta: string,
    form: FormData,
    accion: string,
  ): Promise<Buffer | null> {
    if (!this.isConfigured) {
      this.logger.warn(`GOTENBERG_URL no configurada: no se puede ${accion}`);
      return null;
    }

    const url = `${this.env.GOTENBERG_URL.replace(/\/$/, '')}/${ruta}`;

    try {
      // `Blob`/`FormData` son globales en Node 18+ y axios los serializa nativamente.
      const respuesta = await axios.post<ArrayBuffer>(url, form, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      return Buffer.from(respuesta.data);
    } catch (error) {
      const detalle =
        error instanceof Error ? error.message : 'error desconocido';
      this.logger.error(
        `No se pudo ${accion} con Gotenberg (${url}): ${detalle}`,
      );
      return null;
    }
  }
}
