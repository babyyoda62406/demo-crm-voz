import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Invoice } from './entities/invoice.entity';
import { renderInvoiceHtml } from './templates/invoice.template';
import { getEnvConfig } from '../env/envs';
import { Flag } from '../common/enums/flag.enum';

/** Márgenes del PDF, en pulgadas (formato que espera Gotenberg). */
const MARGENES = {
  marginTop: '0',
  marginBottom: '0',
  marginLeft: '0',
  marginRight: '0',
  paperWidth: '8.27',
  paperHeight: '11.7',
  printBackground: 'true',
};

/**
 * Conversión de la factura a PDF mediante Gotenberg (ruta Chromium HTML).
 *
 * El cuerpo multipart se compone a mano con `Buffer`: así no se añade ninguna
 * dependencia nueva al backend y el contenido va byte a byte tal cual.
 */
@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  /** Genera el PDF de la factura y lo devuelve como buffer. */
  async generate(invoice: Invoice): Promise<Buffer> {
    const env = getEnvConfig();
    const url = `${env.GOTENBERG_URL.replace(/\/+$/, '')}/forms/chromium/convert/html`;
    const html = renderInvoiceHtml(invoice);
    const boundary = `----crmiaFactura${Date.now().toString(16)}`;

    const body = this.buildMultipartBody(boundary, html);

    try {
      const response = await axios.post<ArrayBuffer>(url, body, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(body.length),
        },
        responseType: 'arraybuffer',
        timeout: 30000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(
        `No se pudo generar el PDF de la factura ${invoice.numero}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      throw new HttpException(
        {
          message:
            'No se ha podido generar el PDF de la factura. Revisa que el servicio de conversión esté disponible.',
          flag: Flag.ERROR,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** Nombre de fichero sugerido para la descarga. */
  buildFileName(invoice: Invoice): string {
    return `${invoice.numero}.pdf`;
  }

  /**
   * Compone el cuerpo `multipart/form-data` que espera Gotenberg: el documento
   * debe llamarse `index.html` y los parámetros de página viajan como campos.
   */
  private buildMultipartBody(boundary: string, html: string): Buffer {
    const partes: Buffer[] = [];

    for (const [campo, valor] of Object.entries(MARGENES)) {
      partes.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${campo}"\r\n\r\n${valor}\r\n`,
          'utf8',
        ),
      );
    }

    partes.push(
      Buffer.from(
        `--${boundary}\r\n` +
          'Content-Disposition: form-data; name="files"; filename="index.html"\r\n' +
          'Content-Type: text/html; charset=utf-8\r\n\r\n',
        'utf8',
      ),
    );
    partes.push(Buffer.from(html, 'utf8'));
    partes.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));

    return Buffer.concat(partes);
  }
}
