import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as crypto from 'crypto';
import PizZip = require('pizzip');
import Docxtemplater = require('docxtemplater');

import {
  ContractStatus,
  EntityRef,
  IAssistantActionResult,
  IContractActions,
  IContractTemplateData,
} from '../common/contracts/assistant-actions';
import { Flag } from '../common/enums/flag.enum';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { webhookLoggerSingleton } from '../common/services/webhook-logger-singleton';
import { getEnvConfig } from '../env/envs';

import { Contract } from './entities/contract.entity';
import { ContractTemplate } from './entities/contract-template.entity';
import { Client } from '../clients/entities/client.entity';
import { ContractTemplatesService } from './contract-templates.service';
import { PdfConverterService } from './pdf-converter.service';
import {
  CONTRACT_STATE_FROM_STATUS,
  ContractState,
  ContractStateLabels,
} from './enums/contract-state.enum';
import { ContractFieldType } from './enums/contract-field-type.enum';
import { IContractTemplateField } from './interfaces/contract-template-field.interface';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { FindAllContractDto } from './dto/find-all-contract.dto';
import { SendContractDto } from './dto/send-contract.dto';
import { SignContractDto } from './dto/sign-contract.dto';
import { CreateProrrogaDto } from './dto/create-prorroga.dto';
import {
  formatearImporte,
  importeALetras,
} from './helpers/number-to-words.helper';
import {
  getContractsDir,
  getTemplatePath,
  resolveStoredPath,
  toStoredPath,
} from './helpers/storage-paths.helper';
import { AGENCIA } from './helpers/agency.helper';
import { renderSignatureDiligencePage } from './helpers/signature-page.helper';

/** Fichero generado listo para descargar. */
export interface IContractFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

/** Resultado de enviar un contrato a firma. */
export interface IContractSendResult {
  contrato: Contract;
  /** Enlace servido por la propia API (funciona siempre). */
  enlacePublico: string;
  /** Enlace equivalente dentro de la aplicacion React. */
  enlaceAplicacion: string;
}

/** Vista publica de un contrato (sin datos internos). */
export interface IPublicContractView {
  referencia: string;
  titulo: string;
  plantilla: string;
  estado: ContractState;
  estadoEtiqueta: string;
  tienePdf: boolean;
  firmanteNombre: string | null;
  firmadoAt: Date | null;
  enviadoAt: Date | null;
  /** Marca de la agencia que envia el documento (la ve el firmante). */
  agenciaNombre: string;
  /** Descriptor corto bajo el nombre de la agencia. */
  agenciaDescripcion: string;
}

@Injectable()
export class ContractsService implements IContractActions {
  private readonly logger = new Logger(ContractsService.name);
  private readonly env = getEnvConfig();

  constructor(
    @InjectRepository(Contract)
    private readonly contractDAO: Repository<Contract>,
    @InjectRepository(Client)
    private readonly clientDAO: Repository<Client>,
    private readonly templatesService: ContractTemplatesService,
    private readonly pdfConverter: PdfConverterService,
  ) {}

  // =========================================================================
  // Consulta
  // =========================================================================

  /** Listado paginado de contratos con filtros. */
  async findAll(dto: FindAllContractDto): Promise<ItFindAllResponse<Contract>> {
    const {
      page = 1,
      size = 10,
      search,
      estado,
      templateKey,
      clienteId,
      propiedadId,
    } = dto;

    const base: FindOptionsWhere<Contract> = {};
    if (estado) base.estado = estado;
    if (templateKey) base.templateKey = templateKey;
    if (clienteId) base.clienteId = clienteId;
    if (propiedadId) base.propiedadId = propiedadId;

    // Con `search` se busca en referencia, titulo, cliente y direccion.
    const where: FindOptionsWhere<Contract> | FindOptionsWhere<Contract>[] =
      search
        ? [
            { ...base, referencia: ILike(`%${search}%`) },
            { ...base, titulo: ILike(`%${search}%`) },
            { ...base, clienteNombre: ILike(`%${search}%`) },
            { ...base, propiedadDireccion: ILike(`%${search}%`) },
          ]
        : base;

    const total = await this.contractDAO.count({ where });
    const data = await this.contractDAO.find({
      where,
      skip: (page - 1) * size,
      take: size,
      order: { createdAt: 'desc', id: 'desc' },
    });

    return {
      data,
      metadata: {
        records: total,
        frame: page,
        frameSize: size,
        lastFrame: Math.ceil(total / size) || 1,
      },
    };
  }

  /** Contrato por id. Lanza 404 si no existe. */
  async findOne(id: number): Promise<Contract> {
    const contrato = await this.contractDAO.findOne({ where: { id } });

    if (!contrato) {
      throw new HttpException(
        { message: 'Contrato no encontrado', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return contrato;
  }

  // =========================================================================
  // Generacion
  // =========================================================================

  /** Genera un contrato nuevo: rellena la plantilla, guarda .docx y .pdf. */
  async create(dto: CreateContractDto): Promise<Contract> {
    const plantilla = await this.templatesService.findByKey(dto.templateKey);
    const datos = this.prepararDatos(plantilla, dto.datos ?? {});
    this.validarObligatorios(plantilla, datos);

    const contrato = this.contractDAO.create({
      referencia: await this.generarReferencia(),
      titulo: dto.titulo?.trim() || this.generarTitulo(plantilla, datos, dto),
      template: plantilla,
      templateId: plantilla.id,
      templateKey: plantilla.key,
      datos,
      clienteId: dto.clienteId ?? null,
      clienteNombre: await this.resolverNombreCliente(dto),
      propiedadId: dto.propiedadId ?? null,
      propiedadDireccion:
        dto.propiedadDireccion ?? (datos.direccionInmueble as string) ?? null,
      contratoOrigenId: dto.contratoOrigenId ?? null,
      notas: dto.notas ?? null,
      estado: ContractState.BORRADOR,
    });

    const guardado = await this.contractDAO.save(contrato);
    await this.generarFicheros(guardado, plantilla);

    this.logger.log(
      `Contrato generado ${guardado.referencia} (${plantilla.key})`,
    );

    return await this.findOne(guardado.id);
  }

  /**
   * Nombre del cliente que se guarda desnormalizado en el contrato.
   *
   * `clienteId` y `clienteNombre` llegan como campos independientes y opcionales,
   * asi que un contrato podia guardarse con id pero sin nombre. Aguas abajo eso
   * rompia la facturacion: `POST /api/billing/invoice/from-contract` lee la fila
   * de `contracts` y, al no encontrar `clienteNombre`, respondia 412 aunque el
   * cliente existiera. Cuando falta el nombre pero hay id, se resuelve aqui.
   */
  private async resolverNombreCliente(
    dto: CreateContractDto,
  ): Promise<string | null> {
    const nombreExplicito = dto.clienteNombre?.trim();
    if (nombreExplicito) return nombreExplicito;
    if (!dto.clienteId) return null;

    const cliente = await this.clientDAO.findOne({
      where: { id: dto.clienteId },
      select: { id: true, nombre: true, apellidos: true },
    });
    if (!cliente) return null;

    return [cliente.nombre, cliente.apellidos].filter(Boolean).join(' ').trim();
  }

  /** Actualiza los datos de un contrato y, por defecto, lo vuelve a generar. */
  async update(id: number, dto: UpdateContractDto): Promise<Contract> {
    const contrato = await this.findOne(id);

    if (contrato.estado === ContractState.FIRMADO) {
      throw new HttpException(
        {
          message: 'Un contrato firmado ya no puede modificarse',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const plantilla = await this.templatesService.findByKey(
      dto.templateKey ?? contrato.templateKey,
    );

    if (dto.datos) {
      contrato.datos = this.prepararDatos(plantilla, {
        ...contrato.datos,
        ...dto.datos,
      });
      this.validarObligatorios(plantilla, contrato.datos);
    }

    if (dto.titulo !== undefined) contrato.titulo = dto.titulo;
    if (dto.notas !== undefined) contrato.notas = dto.notas;
    if (dto.clienteId !== undefined) contrato.clienteId = dto.clienteId;
    if (dto.clienteNombre !== undefined)
      contrato.clienteNombre = dto.clienteNombre;
    if (dto.propiedadId !== undefined) contrato.propiedadId = dto.propiedadId;
    if (dto.propiedadDireccion !== undefined)
      contrato.propiedadDireccion = dto.propiedadDireccion;

    if (plantilla.key !== contrato.templateKey) {
      contrato.template = plantilla;
      contrato.templateId = plantilla.id;
      contrato.templateKey = plantilla.key;
    }

    await this.contractDAO.save(contrato);

    if (dto.regenerar !== false) {
      await this.generarFicheros(contrato, plantilla);
    }

    return await this.findOne(id);
  }

  /** Marca el contrato como anulado (borrado logico del ciclo de firma). */
  async anular(id: number): Promise<Contract> {
    const contrato = await this.findOne(id);
    contrato.estado = ContractState.ANULADO;
    contrato.publicToken = null;
    await this.contractDAO.save(contrato);
    this.logger.log(`Contrato anulado ${contrato.referencia}`);
    return contrato;
  }

  /**
   * Elimina el contrato y sus ficheros del disco.
   *
   * Un contrato FIRMADO es la prueba documental de la operacion, asi que no se
   * borra: si hay que retirarlo de la circulacion se anula (`PATCH :id/anular`),
   * que desactiva el enlace de firma y conserva el expediente.
   */
  async remove(id: number): Promise<void> {
    const contrato = await this.findOne(id);

    if (contrato.estado === ContractState.FIRMADO) {
      throw new HttpException(
        {
          message:
            'Un contrato firmado no puede eliminarse: es la prueba de la operación. Puedes anularlo para desactivar su enlace de firma.',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    for (const ruta of [contrato.docxPath, contrato.pdfPath]) {
      if (!ruta) continue;
      try {
        const absoluta = resolveStoredPath(ruta);
        if (fs.existsSync(absoluta)) fs.unlinkSync(absoluta);
      } catch (error) {
        this.logger.warn(`No se pudo borrar el fichero ${ruta}`, error);
      }
    }

    await this.contractDAO.delete(id);
    this.logger.log(`Contrato eliminado ${contrato.referencia}`);
  }

  /**
   * Vuelve a generar los documentos del contrato.
   *
   * Es lo que dispara el boton «Generar el PDF» cuando el contrato no lo tiene
   * (los que se crearon con Gotenberg caido). A diferencia de la generacion
   * inicial, aqui el fallo SI se lanza: la persona usuaria ha pedido explicitamente el
   * PDF y tiene que ver por que no lo ha conseguido, no un clic mudo.
   */
  async regenerarPdf(id: number): Promise<Contract> {
    const contrato = await this.findOne(id);
    const plantilla = await this.templatesService.findByKey(
      contrato.templateKey,
    );

    const generado = await this.generarFicheros(contrato, plantilla);

    if (!generado) {
      throw new HttpException(
        {
          message:
            'No hemos podido preparar el PDF: el servicio de conversión de documentos no responde. El documento Word sí está disponible; vuelve a intentarlo en unos minutos.',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return await this.findOne(id);
  }

  // =========================================================================
  // Descarga de ficheros
  // =========================================================================

  /** Devuelve el .docx o el .pdf del contrato listo para enviar por HTTP. */
  async getFile(id: number, formato: 'docx' | 'pdf'): Promise<IContractFile> {
    const contrato = await this.findOne(id);
    return this.leerFichero(contrato, formato);
  }

  private leerFichero(
    contrato: Contract,
    formato: 'docx' | 'pdf',
  ): IContractFile {
    const ruta = formato === 'pdf' ? contrato.pdfPath : contrato.docxPath;

    if (!ruta || !fs.existsSync(resolveStoredPath(ruta))) {
      throw new HttpException(
        {
          message:
            formato === 'pdf'
              ? 'Este contrato todavía no tiene PDF generado. Vuelve a generarlo cuando el servicio de conversión esté disponible.'
              : 'Este contrato no tiene documento Word generado',
          flag: Flag.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      buffer: fs.readFileSync(resolveStoredPath(ruta)),
      filename: `${contrato.referencia}.${formato}`,
      mimeType:
        formato === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  // =========================================================================
  // Ciclo de firma
  // =========================================================================

  /** Envia el contrato: crea el enlace publico y pasa a estado ENVIADO. */
  async enviar(id: number, dto: SendContractDto): Promise<IContractSendResult> {
    const contrato = await this.findOne(id);

    if (contrato.estado === ContractState.FIRMADO) {
      throw new HttpException(
        {
          message: 'El contrato ya está firmado',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (!contrato.publicToken) {
      contrato.publicToken = crypto.randomBytes(24).toString('hex');
    }

    contrato.estado = ContractState.ENVIADO;
    contrato.enviadoAt = new Date();
    contrato.vistoAt = null;
    if (dto.destinatarioEmail) contrato.destinatarioEmail = dto.destinatarioEmail;

    await this.contractDAO.save(contrato);

    const resultado: IContractSendResult = {
      contrato,
      enlacePublico: this.construirEnlacePublico(contrato.publicToken),
      enlaceAplicacion: this.construirEnlaceAplicacion(contrato.publicToken),
    };

    this.logger.log(
      `Contrato ${contrato.referencia} enviado a firma (${dto.destinatarioEmail ?? 'sin destinatario'})`,
    );
    void this.notificar('contrato_enviado', contrato);

    return resultado;
  }

  /**
   * Recupera un contrato por su token publico. Si estaba ENVIADO lo marca
   * como VISTO (es la traza de apertura del enlace).
   */
  async findByPublicToken(token: string): Promise<Contract> {
    const contrato = await this.contractDAO.findOne({
      where: { publicToken: token },
    });

    if (!contrato || contrato.estado === ContractState.ANULADO) {
      throw new HttpException(
        {
          message: 'El enlace de firma no es válido o ha sido anulado',
          flag: Flag.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (contrato.estado === ContractState.ENVIADO) {
      contrato.estado = ContractState.VISTO;
      contrato.vistoAt = new Date();
      await this.contractDAO.save(contrato);
      this.logger.log(`Contrato ${contrato.referencia} visto por el cliente`);
      void this.notificar('contrato_visto', contrato);
    }

    return contrato;
  }

  /** Firma simulada desde el enlace publico. */
  async firmarPorToken(
    token: string,
    dto: SignContractDto,
    ip?: string,
  ): Promise<Contract> {
    const contrato = await this.findByPublicToken(token);

    if (contrato.estado === ContractState.FIRMADO) {
      throw new HttpException(
        {
          message: 'Este contrato ya estaba firmado',
          flag: Flag.CONFLICT,
        },
        HttpStatus.CONFLICT,
      );
    }

    contrato.estado = ContractState.FIRMADO;
    contrato.firmadoAt = new Date();
    contrato.firmanteNombre = dto.firmanteNombre.trim();
    contrato.firmanteIp = ip ?? null;

    await this.contractDAO.save(contrato);

    this.logger.log(
      `Contrato ${contrato.referencia} FIRMADO por ${contrato.firmanteNombre}`,
    );

    // El documento se rehace para que la firma quede DENTRO del PDF (pagina de
    // diligencia). Si la conversion falla no se deshace la firma: la firma ya
    // esta registrada y el PDF se puede rehacer despues desde la ficha.
    await this.regenerarTrasFirmar(contrato);

    void this.notificar('contrato_firmado', contrato);

    return contrato;
  }

  /** Rehace los documentos del contrato recien firmado, sin propagar fallos. */
  private async regenerarTrasFirmar(contrato: Contract): Promise<void> {
    try {
      const plantilla = await this.templatesService.findByKey(
        contrato.templateKey,
      );
      const generado = await this.generarFicheros(contrato, plantilla);

      if (!generado) {
        this.logger.error(
          `Contrato ${contrato.referencia} firmado pero sin PDF: la conversion no estaba disponible`,
        );
      }
    } catch (error) {
      this.logger.error(
        `No se pudo regenerar el PDF firmado de ${contrato.referencia}`,
        error,
      );
    }
  }

  /** Proyeccion publica: nunca expone los datos internos del contrato. */
  toPublicView(contrato: Contract): IPublicContractView {
    return {
      referencia: contrato.referencia,
      titulo: contrato.titulo,
      plantilla: contrato.template?.nombre ?? contrato.templateKey,
      estado: contrato.estado,
      estadoEtiqueta: ContractStateLabels[contrato.estado],
      tienePdf: Boolean(contrato.pdfPath),
      firmanteNombre: contrato.firmanteNombre ?? null,
      firmadoAt: contrato.firmadoAt ?? null,
      enviadoAt: contrato.enviadoAt ?? null,
      agenciaNombre: AGENCIA.nombre,
      agenciaDescripcion: AGENCIA.descripcion,
    };
  }

  /** PDF accesible desde el enlace publico (sin autenticacion). */
  async getPublicPdf(token: string): Promise<IContractFile> {
    const contrato = await this.findByPublicToken(token);
    return this.leerFichero(contrato, 'pdf');
  }

  // =========================================================================
  // Prorroga
  // =========================================================================

  /**
   * Crea una prorroga a partir de un contrato de alquiler existente,
   * precargando los datos comunes (partes, inmueble, fechas).
   */
  async crearProrroga(
    id: number,
    dto: CreateProrrogaDto,
  ): Promise<Contract> {
    const original = await this.findOne(id);
    const plantillaOriginal = await this.templatesService.findByKey(
      original.templateKey,
    );

    if (!plantillaOriginal.admiteProrroga) {
      throw new HttpException(
        {
          message: `La plantilla "${plantillaOriginal.nombre}" no admite prórroga`,
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const plantillaProrroga = await this.templatesService.findByKey(
      plantillaOriginal.plantillaProrroga ?? 'prorroga',
    );

    const precargados = this.precargarDesdeOriginal(
      original,
      plantillaProrroga,
    );

    return await this.create({
      templateKey: plantillaProrroga.key,
      titulo:
        dto.titulo?.trim() ||
        `Prórroga · ${original.titulo}`.slice(0, 180),
      datos: { ...precargados, ...(dto.datos ?? {}) },
      clienteId: original.clienteId ?? undefined,
      clienteNombre: original.clienteNombre ?? undefined,
      propiedadId: original.propiedadId ?? undefined,
      propiedadDireccion: original.propiedadDireccion ?? undefined,
      contratoOrigenId: original.id,
    });
  }

  /**
   * Datos que la prorroga hereda del contrato original: todos los campos con
   * el mismo nombre, mas las fechas derivadas del periodo original.
   */
  private precargarDesdeOriginal(
    original: Contract,
    plantillaDestino: ContractTemplate,
  ): Record<string, unknown> {
    const origen = original.datos ?? {};
    const precargados: Record<string, unknown> = {};

    for (const campo of plantillaDestino.campos ?? []) {
      if (origen[campo.name] !== undefined && origen[campo.name] !== '') {
        precargados[campo.name] = origen[campo.name];
      }
    }

    // Fecha del contrato original: el encabezado del alquiler que se prorroga.
    if (!precargados.fechaContratoOriginal) {
      const { diaContrato, mesContrato, anioContrato } = origen as Record<
        string,
        string
      >;
      if (diaContrato && mesContrato && anioContrato) {
        precargados.fechaContratoOriginal = `${diaContrato} de ${mesContrato} de ${anioContrato}`;
      }
    }

    // Vencimiento del original: fin de temporada del contrato de alquiler.
    if (!precargados.fechaFinOriginal) {
      const { finDia, finMes, finAnio } = origen as Record<string, string>;
      if (finDia && finMes && finAnio) {
        precargados.fechaFinOriginal = `${finDia} de ${finMes} de ${finAnio}`;
      }
    }

    // La prorroga se firma hoy salvo que la persona usuaria lo cambie.
    const hoy = new Date();
    precargados.diaContrato = String(hoy.getDate());
    precargados.mesContrato = MESES_ES[hoy.getMonth()];
    precargados.anioContrato = String(hoy.getFullYear());

    return precargados;
  }

  // =========================================================================
  // Acciones del asistente de IA (IContractActions)
  // =========================================================================

  /** @inheritdoc */
  async generateContract(
    templateKey: string,
    datos: IContractTemplateData,
    clientRef?: EntityRef,
  ): Promise<IAssistantActionResult<unknown>> {
    try {
      const contrato = await this.create({
        templateKey,
        datos: datos as Record<string, unknown>,
        clienteId: typeof clientRef === 'number' ? clientRef : undefined,
        clienteNombre: typeof clientRef === 'string' ? clientRef : undefined,
      });

      return {
        ok: true,
        mensaje: `Contrato ${contrato.referencia} generado a partir de la plantilla "${contrato.template?.nombre ?? templateKey}".`,
        data: contrato,
      };
    } catch (error) {
      return {
        ok: false,
        mensaje: this.mensajeDeError(
          error,
          'No se pudo generar el contrato solicitado.',
        ),
      };
    }
  }

  /** @inheritdoc */
  async getContractsByStatus(
    status: ContractStatus,
  ): Promise<IAssistantActionResult<unknown[]>> {
    const estados = CONTRACT_STATE_FROM_STATUS[status] ?? [];

    if (estados.length === 0) {
      return {
        ok: true,
        mensaje: `No se hace seguimiento del estado "${status}" en CRMIA.`,
        data: [],
      };
    }

    try {
      const data = await this.contractDAO.find({
        where: { estado: In(estados) },
        order: { createdAt: 'desc' },
        take: 50,
      });

      return {
        ok: true,
        mensaje: data.length
          ? `Hay ${data.length} contrato(s) en estado ${estados.map((e) => ContractStateLabels[e]).join(' o ')}.`
          : 'No hay contratos en ese estado.',
        data,
      };
    } catch (error) {
      return {
        ok: false,
        mensaje: this.mensajeDeError(
          error,
          'No se pudieron consultar los contratos.',
        ),
        data: [],
      };
    }
  }

  /** Contratos pendientes de firma, para el cuadro de mando. */
  async findPendientesDeFirma(): Promise<Contract[]> {
    return await this.contractDAO.find({
      where: { estado: In([ContractState.ENVIADO, ContractState.VISTO]) },
      order: { enviadoAt: 'asc' },
    });
  }

  // =========================================================================
  // Interior: relleno de plantillas
  // =========================================================================

  /**
   * Normaliza los datos antes de rellenar la plantilla:
   * formatea importes, deriva los campos "en letras" vacios y convierte todo
   * a texto (docxtemplater no debe recibir `undefined`).
   */
  private prepararDatos(
    plantilla: ContractTemplate,
    entrada: Record<string, unknown>,
  ): Record<string, unknown> {
    const salida: Record<string, unknown> = { ...entrada };

    for (const campo of plantilla.campos ?? []) {
      if (campo.type === ContractFieldType.LISTA) {
        salida[campo.name] = this.normalizarLista(campo, entrada[campo.name]);
        continue;
      }

      let valor = entrada[campo.name];

      if ((valor === undefined || valor === '') && campo.defaultValue) {
        valor = campo.defaultValue;
      }

      if (campo.type === ContractFieldType.MONEDA && valor !== undefined) {
        valor = formatearImporte(valor);
      }

      // Campos "en letras" que se completan solos a partir de su importe.
      if (campo.derivedFromAmount && (valor === undefined || valor === '')) {
        const enLetras = importeALetras(entrada[campo.derivedFromAmount]);
        if (enLetras) valor = enLetras;
      }

      salida[campo.name] = valor === undefined || valor === null ? '' : String(valor);
    }

    return salida;
  }

  /** Convierte el valor recibido para un campo LISTA en filas limpias. */
  private normalizarLista(
    campo: IContractTemplateField,
    valor: unknown,
  ): Record<string, string>[] {
    if (!Array.isArray(valor)) return [];

    return valor
      .map((fila) => {
        const item: Record<string, string> = {};
        for (const sub of campo.subFields ?? []) {
          const bruto = (fila as Record<string, unknown>)?.[sub.name];
          item[sub.name] = bruto === undefined || bruto === null ? '' : String(bruto);
        }
        return item;
      })
      .filter((fila) => Object.values(fila).some((v) => v.trim() !== ''));
  }

  /** Comprueba que estan todos los campos marcados como obligatorios. */
  private validarObligatorios(
    plantilla: ContractTemplate,
    datos: Record<string, unknown>,
  ): void {
    const faltan = (plantilla.campos ?? [])
      .filter((campo) => campo.required)
      .filter((campo) => {
        const valor = datos[campo.name];
        if (campo.type === ContractFieldType.LISTA) {
          return !Array.isArray(valor) || valor.length === 0;
        }
        return valor === undefined || valor === null || String(valor).trim() === '';
      })
      .map((campo) => campo.label);

    if (faltan.length > 0) {
      throw new HttpException(
        {
          message: `Faltan datos obligatorios: ${faltan.join(', ')}`,
          flag: Flag.VALIDATION_ERROR,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.validarLimitesDeLista(plantilla, datos);
  }

  /**
   * Respeta el maximo de filas declarado por la plantilla (`maxRows`).
   *
   * Sin esta guarda se podian guardar 6 ocupantes en un contrato cuya clausula
   * cuarta prohibe la sobreocupacion por encima de 4: el documento se
   * contradecia a si mismo cuatro parrafos mas abajo.
   */
  private validarLimitesDeLista(
    plantilla: ContractTemplate,
    datos: Record<string, unknown>,
  ): void {
    for (const campo of plantilla.campos ?? []) {
      if (campo.type !== ContractFieldType.LISTA || !campo.maxRows) continue;

      const filas = datos[campo.name];
      if (Array.isArray(filas) && filas.length > campo.maxRows) {
        throw new HttpException(
          {
            message: `«${campo.label}»: el máximo son ${campo.maxRows} y has indicado ${filas.length}.`,
            flag: Flag.VALIDATION_ERROR,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  /**
   * Rellena la plantilla, escribe el .docx y (si se puede) el .pdf.
   *
   * Cuando el contrato ya esta FIRMADO, al PDF se le anade la pagina de
   * diligencia de firma, de modo que el fichero que se descarga desde cualquier
   * boton (ficha, listado o enlace publico) es siempre la version firmada.
   *
   * @returns `true` si el PDF quedo escrito en disco.
   */
  private async generarFicheros(
    contrato: Contract,
    plantilla: ContractTemplate,
  ): Promise<boolean> {
    const rutaPlantilla = getTemplatePath(plantilla.archivo);

    if (!fs.existsSync(rutaPlantilla)) {
      throw new HttpException(
        {
          message: `No se encuentra el fichero de la plantilla "${plantilla.archivo}". Ejecuta el etiquetador de plantillas.`,
          flag: Flag.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const docx = this.renderizarDocx(rutaPlantilla, contrato.datos, contrato);
    const carpeta = getContractsDir();
    const base = `${contrato.referencia}`;

    fs.writeFileSync(`${carpeta}/${base}.docx`, docx);
    contrato.docxPath = toStoredPath(`${base}.docx`);

    let pdf = await this.pdfConverter.docxToPdf(docx, `${base}.docx`);

    if (pdf && contrato.estado === ContractState.FIRMADO) {
      pdf = await this.estamparDiligencia(pdf, contrato);
    }

    if (pdf) {
      fs.writeFileSync(`${carpeta}/${base}.pdf`, pdf);
      contrato.pdfPath = toStoredPath(`${base}.pdf`);
    }

    await this.contractDAO.save(contrato);

    return Boolean(pdf);
  }

  /**
   * Anade al final del contrato la pagina de diligencia de firma electronica.
   * Si la composicion falla se devuelve el PDF original: mejor el documento sin
   * diligencia que ningun documento.
   */
  private async estamparDiligencia(
    pdf: Buffer,
    contrato: Contract,
  ): Promise<Buffer> {
    const huella = crypto.createHash('sha256').update(pdf).digest('hex');
    const diligencia = await this.pdfConverter.htmlToPdf(
      renderSignatureDiligencePage(contrato, huella),
    );

    if (!diligencia) {
      this.logger.error(
        `No se pudo componer la diligencia de firma de ${contrato.referencia}`,
      );
      return pdf;
    }

    const unido = await this.pdfConverter.mergePdfs([pdf, diligencia]);

    if (!unido) {
      this.logger.error(
        `No se pudo unir la diligencia de firma a ${contrato.referencia}`,
      );
      return pdf;
    }

    // La union descarta los metadatos que traia el documento convertido.
    const conMetadatos = await this.pdfConverter.setPdfMetadata(unido, {
      Author: AGENCIA.nombre,
      Creator: AGENCIA.nombre,
      Title: `${contrato.referencia} · ${contrato.titulo}`,
      Subject: `Documento firmado por ${contrato.firmanteNombre ?? ''}`.trim(),
    });

    return conMetadatos ?? unido;
  }

  /** Ejecuta docxtemplater sobre la plantilla y devuelve el documento. */
  private renderizarDocx(
    rutaPlantilla: string,
    datos: Record<string, unknown>,
    contrato?: Contract,
  ): Buffer {
    try {
      const zip = new PizZip(fs.readFileSync(rutaPlantilla));

      // Antes de rellenar nada: las plantillas .docx llegan con el autor de
      // quien las redacto y ese nombre viajaba dentro de todos los contratos.
      this.aplicarMetadatos(zip, contrato);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        // Un marcador sin valor se queda en blanco, nunca como "undefined".
        nullGetter: () => '',
      });

      doc.render(datos);

      return doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      }) as Buffer;
    } catch (error) {
      const detalle = this.explicarErrorDocxtemplater(error);
      this.logger.error(`Error al rellenar la plantilla: ${detalle}`);
      throw new HttpException(
        {
          message: `No se pudo rellenar la plantilla: ${detalle}`,
          flag: Flag.ERROR,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  /**
   * Reescribe las propiedades del documento .docx (autor, titulo, empresa).
   *
   * Una plantilla .docx conserva en `docProps/core.xml` el nombre de quien la
   * redacto, y LibreOffice lo copia tal cual al PDF: el cliente abria las
   * propiedades del contrato y veia un nombre ajeno a la agencia. Aqui se
   * sustituye por la razon social y la referencia del contrato.
   */
  private aplicarMetadatos(zip: PizZip, contrato?: Contract): void {
    const ahora = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const titulo = contrato
      ? `${contrato.referencia} · ${contrato.titulo}`
      : AGENCIA.nombre;

    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escaparXml(titulo)}</dc:title><dc:subject>${escaparXml(contrato?.titulo ?? '')}</dc:subject><dc:creator>${escaparXml(AGENCIA.nombre)}</dc:creator><cp:keywords></cp:keywords><dc:description></dc:description><cp:lastModifiedBy>${escaparXml(AGENCIA.nombre)}</cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${ahora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${ahora}</dcterms:modified></cp:coreProperties>`;

    try {
      zip.file('docProps/core.xml', core);

      // `app.xml` solo se retoca si existe: se cambia la empresa y se borra la
      // plantilla de origen, dejando el resto de contadores intactos.
      const app = zip.file('docProps/app.xml')?.asText();
      if (app) {
        zip.file(
          'docProps/app.xml',
          app
            .replace(
              /<Company>.*?<\/Company>/,
              `<Company>${escaparXml(AGENCIA.nombre)}</Company>`,
            )
            .replace(/<Manager>.*?<\/Manager>/, ''),
        );
      }
    } catch (error) {
      // Los metadatos son cosmeticos: nunca deben impedir generar el contrato.
      this.logger.warn('No se pudieron fijar los metadatos del documento', error);
    }
  }

  /** Traduce los errores de docxtemplater a un mensaje util en espanol. */
  private explicarErrorDocxtemplater(error: unknown): string {
    const propiedades = (
      error as { properties?: { errors?: { properties?: { explanation?: string } }[] } }
    )?.properties;

    if (propiedades?.errors?.length) {
      return propiedades.errors
        .map((e) => e.properties?.explanation ?? 'marcador inválido')
        .join('; ');
    }

    return error instanceof Error ? error.message : 'error desconocido';
  }

  private mensajeDeError(error: unknown, porDefecto: string): string {
    if (error instanceof HttpException) {
      const respuesta = error.getResponse() as { message?: string };
      if (respuesta?.message) return respuesta.message;
    }
    return porDefecto;
  }

  // =========================================================================
  // Interior: utilidades
  // =========================================================================

  /** Referencia correlativa por ano: CT-2026-0001. */
  private async generarReferencia(): Promise<string> {
    const anio = new Date().getFullYear();
    const prefijo = `CT-${anio}-`;

    const total = await this.contractDAO
      .createQueryBuilder('contrato')
      .where('contrato.referencia LIKE :prefijo', { prefijo: `${prefijo}%` })
      .getCount();

    let secuencia = total + 1;
    let referencia = `${prefijo}${String(secuencia).padStart(4, '0')}`;

    // Blindaje ante huecos por borrados: se busca el primer libre.
    while (await this.contractDAO.findOne({ where: { referencia } })) {
      secuencia += 1;
      referencia = `${prefijo}${String(secuencia).padStart(4, '0')}`;
    }

    return referencia;
  }

  /** Titulo automatico cuando la persona usuaria no escribe uno. */
  private generarTitulo(
    plantilla: ContractTemplate,
    datos: Record<string, unknown>,
    dto: CreateContractDto,
  ): string {
    const referencia =
      (datos.direccionInmueble as string) ||
      dto.propiedadDireccion ||
      (datos.clienteNombre as string) ||
      (datos.arrendatarioRazonSocial as string) ||
      dto.clienteNombre;

    return (referencia ? `${plantilla.nombre} · ${referencia}` : plantilla.nombre).slice(
      0,
      180,
    );
  }

  private construirEnlacePublico(token: string): string {
    return `${this.env.URL.replace(/\/$/, '')}/api/contracts/public/${token}`;
  }

  /**
   * Enlace que se comparte con el cliente.
   *
   * Lleva `#` porque el front monta un `HashRouter`: sin el, la ruta
   * `/firmar/<token>` acababa en la pantalla de login del CRM.
   */
  private construirEnlaceAplicacion(token: string): string {
    return `${this.env.FRONTEND_URL.replace(/\/$/, '')}/#/firmar/${token}`;
  }

  /**
   * Notificacion de la transicion de estado. Se apoya en el webhook comun del
   * proyecto (silencioso si no esta configurado) y siempre deja traza en el log.
   */
  private async notificar(evento: string, contrato: Contract): Promise<void> {
    await webhookLoggerSingleton.sendLog({
      origen: 'contracts',
      evento,
      referencia: contrato.referencia,
      titulo: contrato.titulo,
      estado: contrato.estado,
      estadoEtiqueta: ContractStateLabels[contrato.estado],
      cliente: contrato.clienteNombre,
      fecha: new Date().toISOString(),
    });
  }
}

/** Escapado minimo para meter texto dentro del XML de propiedades del .docx. */
const escaparXml = (valor: string): string =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Nombres de mes en espanol, para los encabezados «a 11 de agosto de 2026». */
export const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
