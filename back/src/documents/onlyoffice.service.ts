import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { DocumentsService } from './documents.service';
import { getEnvConfig, EnvConfig } from '../env/envs';
import { Flag } from '../common/enums/flag.enum';
import { ItPrivileges } from '../auth/interfaces/it-privileges.interface';
import { ItJwtPayload } from '../auth/interfaces/it-jwt-payload.interface';
import {
  ItOnlyOfficeConfig,
  ItOnlyOfficeConfigResponse,
  ItOnlyOfficeCallbackBody,
  ItOnlyOfficePermissions,
  OnlyOfficeStatus,
} from './interfaces/it-onlyoffice.interface';
import {
  esEditableOnlyOffice,
  getDocumentType,
  getExtension,
} from './helpers/document-type.helper';

/**
 * Integracion con ONLYOFFICE Document Server.
 *
 * TRES URLS DISTINTAS, TRES PUNTOS DE VISTA — es el punto donde mas se falla:
 *
 * 1. `scriptUrl`   -> lo carga el NAVEGADOR -> `ONLYOFFICE_PUBLIC_URL` (con
 *    respaldo en `ONLYOFFICE_URL`). NUNCA puede salir de `ONLYOFFICE_URL` a
 *    secas: en produccion esa variable vale `http://onlyoffice`, el nombre del
 *    servicio en la red de Docker, que el navegador del cliente no resuelve y
 *    que hacia morir al editor con "No se pudo contactar con el servidor de
 *    edicion".
 * 2. `document.url` y `callbackUrl` -> los pide el CONTENEDOR de ONLYOFFICE
 *    -> la API vista desde Docker (`ONLYOFFICE_INTERNAL_API_URL`, o `URL` con
 *    `localhost` reescrito a `host.docker.internal`).
 * 3. `body.url` del callback -> lo sirve el propio ONLYOFFICE y lo descarga el
 *    BACKEND -> si el host interno no resuelve, se reintenta contra `ONLYOFFICE_URL`
 *    (la interna: quien descarga aqui es el backend, no el navegador).
 *
 * Ambos extremos comparten el secreto `ONLYOFFICE_JWT_SECRET`: la config va
 * firmada al editor y el callback llega firmado de vuelta.
 */
@Injectable()
export class OnlyOfficeService {
  private readonly logger = new Logger(OnlyOfficeService.name);
  private readonly env: EnvConfig = getEnvConfig();

  constructor(private readonly documentsService: DocumentsService) {}

  // -------------------------------------------------------------------------
  // Configuracion del editor
  // -------------------------------------------------------------------------

  /**
   * Config firmada para `new DocsAPI.DocEditor(...)`.
   * @param id Documento a abrir.
   * @param usuario Usuario autenticado: de sus privilegios salen los permisos.
   */
  async getEditorConfig(
    id: number,
    usuario: ItJwtPayload,
  ): Promise<ItOnlyOfficeConfigResponse> {
    const fichero = await this.documentsService.findOneFile(id);
    const documentType = getDocumentType(fichero.nombre);

    if (!documentType) {
      throw new HttpException(
        {
          message: 'Este tipo de fichero no se puede abrir en el editor',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const privilegios = usuario?.privileges ?? [];
    const puedeEditar =
      privilegios.includes(ItPrivileges.ALL_PRIVILEGES) ||
      privilegios.includes(ItPrivileges.EDIT_DOCUMENT);
    const formatoEditable = esEditableOnlyOffice(fichero.nombre);
    const editable = puedeEditar && formatoEditable;

    const permissions: ItOnlyOfficePermissions = {
      edit: editable,
      download: true,
      print: true,
      review: editable,
      comment: editable,
      fillForms: editable,
      copy: true,
    };

    const apiInterna = this.getInternalApiUrl();
    const tokenAcceso = this.firmarTokenAcceso(fichero.id);

    const config: ItOnlyOfficeConfig = {
      document: {
        fileType: getExtension(fichero.nombre),
        key: this.construirKey(fichero.id, fichero.version, fichero.updatedAt),
        title: fichero.nombre,
        url: `${apiInterna}/api/documents/${fichero.id}/raw?token=${tokenAcceso}`,
        permissions,
      },
      documentType,
      editorConfig: {
        lang: 'es',
        mode: editable ? 'edit' : 'view',
        callbackUrl: `${apiInterna}/api/documents/${fichero.id}/onlyoffice-callback?token=${tokenAcceso}`,
        user: {
          id: String(usuario?.id ?? 0),
          name: usuario?.email ?? 'Usuario de CRMIA',
        },
        customization: {
          autosave: true,
          forcesave: true,
          chat: false,
          comments: editable,
          compactHeader: false,
          feedback: false,
          help: false,
          hideRightMenu: true,
          toolbarNoTabs: false,
          uiTheme: 'theme-classic-light',
        },
      },
      height: '100%',
      width: '100%',
    };

    // La firma cubre la config COMPLETA: si el navegador altera un solo campo
    // (por ejemplo `permissions.edit`), ONLYOFFICE rechaza la sesion.
    if (this.getSecretoJwt()) {
      config.token = jwt.sign(
        config as unknown as Record<string, unknown>,
        this.getSecretoJwt(),
        { expiresIn: '12h' },
      );
    }

    return {
      scriptUrl: `${this.getPublicUrl()}/web-apps/apps/api/documents/api.js`,
      config,
      editable,
    };
  }

  // -------------------------------------------------------------------------
  // Callback de guardado
  // -------------------------------------------------------------------------

  /**
   * Procesa la notificacion de ONLYOFFICE tras editar.
   *
   * Estados relevantes: 2 (el documento esta listo para guardarse, ya no hay
   * nadie editando) y 6 (guardado forzado con la sesion aun abierta). En ambos
   * se descarga la version nueva y se sobrescribe el fichero.
   *
   * @returns SIEMPRE `{ error: 0 }` en caso de exito. Es el contrato literal de
   *          ONLYOFFICE: cualquier otra forma (incluido el sobre
   *          `{ message, flag, data }` del resto de la API) se interpreta como
   *          fallo y el servidor reintenta el guardado en bucle.
   */
  async procesarCallback(
    id: number,
    body: ItOnlyOfficeCallbackBody,
    cabeceraAutorizacion?: string,
  ): Promise<{ error: number }> {
    this.verificarFirmaCallback(body, cabeceraAutorizacion);

    const status = Number(body?.status ?? 0);

    if (
      status !== OnlyOfficeStatus.LISTO_PARA_GUARDAR &&
      status !== OnlyOfficeStatus.GUARDADO_FORZADO
    ) {
      if (
        status === OnlyOfficeStatus.ERROR_AL_GUARDAR ||
        status === OnlyOfficeStatus.ERROR_GUARDADO_FORZADO
      ) {
        this.logger.error(
          `ONLYOFFICE informó de un error al guardar el documento ${id} (status ${status})`,
        );
      }
      // Estados 1 y 4: nada que persistir, pero hay que confirmar la recepcion.
      return { error: 0 };
    }

    if (!body.url) {
      this.logger.error(
        `ONLYOFFICE no envió la URL de descarga del documento ${id} (status ${status})`,
      );
      return { error: 1 };
    }

    try {
      const contenido = await this.descargarVersionEditada(body.url);
      await this.documentsService.reemplazarContenido(id, contenido);
      return { error: 0 };
    } catch (error) {
      this.logger.error(
        `No se pudo guardar la versión editada del documento ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { error: 1 };
    }
  }

  // -------------------------------------------------------------------------
  // Tokens de acceso al binario
  // -------------------------------------------------------------------------

  /**
   * Token corto que autoriza a descargar UN documento concreto.
   *
   * El contenedor de ONLYOFFICE no puede enviar la cabecera `token` del CRM, de
   * modo que la descarga viaja firmada en la query. El token va atado al id del
   * fichero, asi que no sirve para pescar otros documentos.
   */
  firmarTokenAcceso(fileId: number): string {
    return jwt.sign({ fileId, alcance: 'documento' }, this.getSecretoJwt(), {
      expiresIn: '12h',
    });
  }

  /** Valida el token de la query y comprueba que corresponde a este fichero. */
  verificarTokenAcceso(token: string, fileId: number): void {
    if (!token) {
      throw new HttpException(
        { message: 'Falta el token de acceso al documento', flag: Flag.UNAUTHORIZED },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const payload = jwt.verify(token, this.getSecretoJwt()) as {
        fileId?: number;
        alcance?: string;
      };

      if (Number(payload?.fileId) !== Number(fileId)) {
        throw new Error('El token no corresponde a este documento');
      }
    } catch (error) {
      throw new HttpException(
        {
          message: 'Token de acceso al documento inválido o caducado',
          flag: Flag.INVALID_TOKEN,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Interno
  // -------------------------------------------------------------------------

  /**
   * Secreto compartido con el Document Server. Si no se configuro
   * `ONLYOFFICE_JWT_SECRET` se recurre al secreto de sesion del CRM, para que
   * los tokens de descarga sigan firmados aunque ONLYOFFICE corra sin JWT.
   */
  private getSecretoJwt(): string {
    return this.env.ONLYOFFICE_JWT_SECRET || this.env.JWTSECRET;
  }

  /** `true` si el Document Server tiene la validacion JWT activada. */
  private jwtActivadoEnDocumentServer(): boolean {
    return Boolean(this.env.ONLYOFFICE_JWT_SECRET);
  }

  /**
   * URL del Document Server tal como la ve el NAVEGADOR del usuario.
   *
   * Es la unica que puede viajar en `scriptUrl`. En produccion el backend habla
   * con ONLYOFFICE por el nombre de servicio de la red de compose
   * (`ONLYOFFICE_URL=http://onlyoffice`), que fuera de Docker no existe; por eso
   * la publica se configura aparte. En desarrollo ambas coinciden
   * (`http://localhost:8081`) y el respaldo hace que no haya que declarar nada.
   *
   * El respaldo cubre tambien la cadena vacia, no solo `undefined`: compose
   * interpola `${ONLYOFFICE_PUBLIC_URL}` como `""` cuando la variable no esta
   * en el `.env`, y un `""` aqui generaria un `scriptUrl` relativo y roto.
   */
  private getPublicUrl(): string {
    const publica = this.env.ONLYOFFICE_PUBLIC_URL || this.env.ONLYOFFICE_URL;
    return publica.replace(/\/+$/, '');
  }

  /**
   * URL de la API tal como la ve el contenedor de ONLYOFFICE.
   * `localhost` dentro del contenedor es el propio contenedor, no el host: por
   * eso se reescribe a `host.docker.internal`, salvo que se indique una URL
   * explicita en `ONLYOFFICE_INTERNAL_API_URL`.
   *
   * Para que `host.docker.internal` resuelva en Linux, el servicio `onlyoffice`
   * necesita `extra_hosts: ["host.docker.internal:host-gateway"]` (ya declarado
   * en `docker-compose.dev.yml`). En produccion el backend tambien corre en
   * Docker y `URL` es el dominio publico, asi que la reescritura no se aplica y
   * el Document Server sale por el dominio real (hairpin por el proxy inverso).
   */
  private getInternalApiUrl(): string {
    const explicita = this.env.ONLYOFFICE_INTERNAL_API_URL;
    if (explicita) return explicita.replace(/\/+$/, '');

    return this.env.URL.replace(/\/+$/, '').replace(
      /\/\/(localhost|127\.0\.0\.1)(:|\/|$)/,
      '//host.docker.internal$2',
    );
  }

  /**
   * Clave de version del documento.
   * ONLYOFFICE cachea por `key`: si no cambia tras editar, el usuario vuelve a
   * abrir la version antigua. Solo admite `[0-9a-zA-Z.=_-]` y 128 caracteres.
   */
  private construirKey(id: number, version: number, updatedAt?: Date): string {
    const marca = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    return `crmia-${id}-v${version}-${marca}`.replace(/[^0-9a-zA-Z.=_-]/g, '').slice(0, 128);
  }

  /**
   * Comprueba la firma del callback (cabecera `Authorization: Bearer` o campo
   * `token` del cuerpo). Sin ella, cualquiera que alcance la ruta podria
   * sobrescribir documentos del CRM.
   */
  private verificarFirmaCallback(
    body: ItOnlyOfficeCallbackBody,
    cabeceraAutorizacion?: string,
  ): void {
    if (!this.jwtActivadoEnDocumentServer()) return;

    const desdeCabecera = cabeceraAutorizacion?.startsWith('Bearer ')
      ? cabeceraAutorizacion.slice('Bearer '.length)
      : undefined;
    const token = desdeCabecera || body?.token;

    if (!token) {
      throw new HttpException(
        { message: 'Callback de ONLYOFFICE sin firma', flag: Flag.UNAUTHORIZED },
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      jwt.verify(token, this.env.ONLYOFFICE_JWT_SECRET);
    } catch (error) {
      throw new HttpException(
        { message: 'Firma del callback de ONLYOFFICE inválida', flag: Flag.INVALID_TOKEN },
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  /**
   * Descarga la version editada que ONLYOFFICE deja en su cache.
   * La URL suele apuntar al nombre interno del contenedor; si no resuelve desde
   * el backend, se reintenta cambiando el origen por `ONLYOFFICE_URL`.
   */
  private async descargarVersionEditada(url: string): Promise<Buffer> {
    try {
      return await this.descargarBinario(url);
    } catch (error) {
      const alternativa = this.reescribirOrigen(url);

      if (!alternativa || alternativa === url) throw error;

      this.logger.warn(
        `Descarga directa fallida; reintentando la versión editada contra ${alternativa}`,
      );
      return this.descargarBinario(alternativa);
    }
  }

  private async descargarBinario(url: string): Promise<Buffer> {
    const respuesta = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      // El Document Server puede servir la cache por HTTPS con certificado propio.
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return Buffer.from(respuesta.data);
  }

  /** Cambia el origen de una URL por el de `ONLYOFFICE_URL`, conservando la ruta. */
  private reescribirOrigen(url: string): string | null {
    try {
      const original = new URL(url);
      const base = new URL(this.env.ONLYOFFICE_URL);
      original.protocol = base.protocol;
      original.host = base.host;
      return original.toString();
    } catch {
      return null;
    }
  }
}
