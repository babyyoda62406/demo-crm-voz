import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceSequence } from './entities/invoice-sequence.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { FindAllInvoiceDto } from './dto/find-all-invoice.dto';
import { CreateInvoiceFromContractDto } from './dto/create-invoice-from-contract.dto';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import { InvoiceLineDto } from './dto/invoice-line.dto';
import { InvoiceStatus } from './enums/invoice-status.enum';
import {
  IInvoiceLine,
  IInvoiceSummary,
} from './interfaces/invoice-line.interface';
import { parsearImporte, redondear } from './helpers/money.helper';
import { InvoicePdfService } from './invoice-pdf.service';
import { ItFindAllResponse } from '../common/interfaces/find-all-response.interface';
import { Flag } from '../common/enums/flag.enum';

/** Prefijo de la numeración correlativa de facturas. */
const PREFIJO_FACTURA = 'FRA';

/** Dígitos del correlativo dentro del ejercicio (`FRA-2026-0001`). */
const DIGITOS_CORRELATIVO = 4;

/**
 * Clave del bloqueo de aviso de PostgreSQL que serializa la numeración.
 * `pg_advisory_xact_lock(clave, ejercicio)` se libera solo al cerrar la
 * transacción, así que dos altas simultáneas nunca comparten número.
 */
const CLAVE_BLOQUEO_NUMERACION = 715_341;

/** Histórico de facturación de un cliente. */
export interface IClientInvoiceHistory {
  clienteId: number;
  clienteNombre: string | null;
  facturas: Invoice[];
  resumen: IInvoiceSummary;
}

/** Datos precargados a partir de un contrato, antes de aplicar los del DTO. */
interface IContractPrefill {
  clienteId?: number;
  clienteNombre?: string;
  contratoReferencia?: string;
  concepto?: string;
  importe?: number;
}

/** Datos fiscales leídos de la ficha del cliente. */
interface IClientFiscalData {
  nombre?: string;
  documento?: string;
  direccion?: string;
  email?: string;
}

/**
 * Claves del `jsonb` `contracts.datos` de las que sale el importe a facturar,
 * en orden de preferencia: primero los honorarios de la agencia (que es lo que
 * se factura), después la reserva y por último la renta mensual. Las cifras se
 * guardan como texto en formato español, así que las normaliza `parsearImporte`.
 */
const CLAVES_IMPORTE_CONTRATO = [
  'honorariosTotales',
  'honorariosPrimerPago',
  'importeReservaBase',
  'importeReservaTotal',
  'precioMensualCifra',
  'importe',
  'honorarios',
  'precio',
  'rentaMensual',
  'renta',
];

/**
 * Servicio del dominio Facturación: emisión numerada, cálculo de IVA,
 * seguimiento de cobros, histórico por cliente y PDF de la factura.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceDAO: Repository<Invoice>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  // =========================================================================
  // Alta
  // =========================================================================

  /**
   * Emite una factura nueva.
   *
   * Todo ocurre dentro de una transacción: se toma el bloqueo del ejercicio, se
   * incrementa el contador, se compone el número y se guarda la factura. Si el
   * guardado falla, el contador vuelve atrás y el número no se pierde.
   */
  async create(dto: CreateInvoiceDto, createdById?: number): Promise<Invoice> {
    const lineas = this.calcularLineas(dto.lineas);
    const tipoIva = this.normalizarTipoIva(dto.tipoIva);
    const fechaEmision = this.soloFecha(dto.fechaEmision) ?? this.hoy();
    const importes = this.calcularImportes(lineas, tipoIva);

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const { numero, ejercicio, secuencia } = await this.reservarNumero(
        manager,
        fechaEmision,
      );

      const invoice = manager.create(Invoice, {
        numero,
        ejercicio,
        secuencia,
        clienteId: dto.clienteId,
        clienteNombre: dto.clienteNombre,
        clienteDocumento: dto.clienteDocumento ?? null,
        clienteDireccion: dto.clienteDireccion ?? null,
        clienteEmail: dto.clienteEmail ?? null,
        contratoId: dto.contratoId ?? null,
        contratoReferencia: dto.contratoReferencia ?? null,
        lineas,
        tipoIva,
        ...importes,
        estado: InvoiceStatus.EMITIDA,
        fechaEmision,
        fechaCobro: null,
        notas: dto.notas ?? null,
        createdById: createdById ?? null,
      });

      const guardada = await manager.save(Invoice, invoice);
      this.logger.log(
        `Factura emitida: ${guardada.numero} (${guardada.total} €) para el cliente ${guardada.clienteId}`,
      );

      return guardada;
    });
  }

  /**
   * Emite una factura a partir de un contrato, precargando concepto, importe y
   * datos del cliente. Lo que llegue en el DTO tiene prioridad sobre lo leído
   * del contrato, para que la persona usuaria pueda ajustar el importe antes de emitir.
   *
   * El cliente sale de `contracts.clienteId` / `contracts.clienteNombre`; si el
   * contrato no tiene cliente vinculado, el modal manda uno elegido a mano y la
   * emisión sigue adelante. Los datos fiscales que faltan (NIF, dirección,
   * correo) se completan leyendo la ficha del cliente: sin NIF ni domicilio la
   * factura no sería válida (RD 1619/2012, art. 6).
   */
  async createFromContract(
    dto: CreateInvoiceFromContractDto,
    createdById?: number,
  ): Promise<Invoice> {
    const precarga = await this.precargarDesdeContrato(dto.contratoId);

    const clienteId = dto.clienteId ?? precarga.clienteId;
    const concepto = dto.concepto ?? precarga.concepto;
    const importe = dto.importe ?? precarga.importe;

    if (!clienteId) {
      throw new HttpException(
        {
          message:
            'El contrato no tiene cliente asociado. Elige uno en el desplegable «Cliente» del formulario.',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const ficha = await this.datosFiscalesCliente(clienteId);
    const clienteNombre = dto.clienteNombre ?? precarga.clienteNombre ?? ficha.nombre;

    if (!clienteNombre) {
      throw new HttpException(
        {
          message:
            'No se ha podido obtener el nombre fiscal del cliente. Indícalo en el formulario.',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (importe === undefined || importe === null) {
      throw new HttpException(
        {
          message:
            'El contrato no indica ningún importe facturable. Escríbelo en «Importe sin IVA».',
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    const createDto: CreateInvoiceDto = {
      clienteId,
      clienteNombre,
      clienteDocumento: dto.clienteDocumento ?? ficha.documento,
      clienteDireccion: dto.clienteDireccion ?? ficha.direccion,
      clienteEmail: dto.clienteEmail ?? ficha.email,
      contratoId: dto.contratoId,
      contratoReferencia:
        dto.contratoReferencia ??
        precarga.contratoReferencia ??
        `Contrato #${dto.contratoId}`,
      lineas: [
        {
          concepto: concepto ?? `Servicios del contrato #${dto.contratoId}`,
          cantidad: dto.cantidad ?? 1,
          precioUnitario: importe,
        },
      ],
      tipoIva: dto.tipoIva,
      fechaEmision: dto.fechaEmision,
      notas: dto.notas,
    };

    return this.create(createDto, createdById);
  }

  // =========================================================================
  // Consulta
  // =========================================================================

  /** Listado paginado de facturas con filtros de estado, cliente y fechas. */
  async findAll(dto: FindAllInvoiceDto): Promise<ItFindAllResponse<Invoice>> {
    const page = dto.page ?? 1;
    const size = dto.size ?? 10;

    const qb = this.invoiceDAO.createQueryBuilder('invoice');
    this.aplicarFiltros(qb, dto);

    const [data, total] = await qb
      .orderBy('invoice.fechaEmision', 'DESC')
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

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

  /**
   * Totales del periodo para el mismo filtro del listado.
   *
   * Se leen sólo las cuatro columnas necesarias y se agregan en memoria: el
   * volumen de facturas de la agencia lo permite de sobra y así el resumen y el
   * listado comparten exactamente el mismo filtro, sin SQL duplicado.
   */
  async resumen(dto: FindAllInvoiceDto): Promise<IInvoiceSummary> {
    const qb = this.invoiceDAO
      .createQueryBuilder('invoice')
      .select([
        'invoice.id',
        'invoice.estado',
        'invoice.baseImponible',
        'invoice.cuotaIva',
        'invoice.total',
      ]);
    this.aplicarFiltros(qb, dto);

    return this.agregarResumen(await qb.getMany());
  }

  /** Devuelve una factura por su identificador. */
  async findOne(id: number): Promise<Invoice> {
    const invoice = await this.invoiceDAO.findOne({ where: { id } });

    if (!invoice) {
      throw new HttpException(
        { message: 'Factura no encontrada', flag: Flag.NOT_FOUND },
        HttpStatus.NOT_FOUND,
      );
    }

    return invoice;
  }

  /** Histórico completo de facturación de un cliente, con sus totales. */
  async findByClient(clienteId: number): Promise<IClientInvoiceHistory> {
    const facturas = await this.invoiceDAO.find({
      where: { clienteId },
      order: { fechaEmision: 'DESC', id: 'DESC' },
    });

    return {
      clienteId,
      clienteNombre: facturas.length ? facturas[0].clienteNombre : null,
      facturas,
      resumen: this.agregarResumen(facturas),
    };
  }

  // =========================================================================
  // Modificación de estado
  // =========================================================================

  /**
   * Actualiza una factura. Sólo se permite mientras siga `emitida`, y nunca
   * sobre los importes: una factura emitida ya está numerada y puede estar en
   * manos del cliente, así que reescribir su base o su IVA dejaría dos
   * documentos distintos con el mismo número. Para cambiar el importe hay que
   * anularla y emitir una rectificativa.
   */
  async update(id: number, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.estado !== InvoiceStatus.EMITIDA) {
      throw new HttpException(
        {
          message: `La factura ${invoice.numero} está ${invoice.estado} y ya no se puede modificar.`,
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (dto.lineas !== undefined || dto.tipoIva !== undefined) {
      throw new HttpException(
        {
          message: `El importe de la factura ${invoice.numero} no se puede cambiar una vez emitida. Anúlala y emite una nueva.`,
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (dto.clienteId !== undefined) invoice.clienteId = dto.clienteId;
    if (dto.clienteNombre !== undefined) invoice.clienteNombre = dto.clienteNombre;
    if (dto.clienteDocumento !== undefined)
      invoice.clienteDocumento = dto.clienteDocumento;
    if (dto.clienteDireccion !== undefined)
      invoice.clienteDireccion = dto.clienteDireccion;
    if (dto.clienteEmail !== undefined) invoice.clienteEmail = dto.clienteEmail;
    if (dto.contratoId !== undefined) invoice.contratoId = dto.contratoId;
    if (dto.contratoReferencia !== undefined)
      invoice.contratoReferencia = dto.contratoReferencia;
    if (dto.notas !== undefined) invoice.notas = dto.notas;
    if (dto.fechaEmision !== undefined) {
      // La fecha de emisión no cambia de ejercicio: el número ya está asignado
      // dentro del correlativo de su año.
      const nueva = this.soloFecha(dto.fechaEmision);
      if (nueva && Number(nueva.slice(0, 4)) !== invoice.ejercicio) {
        throw new HttpException(
          {
            message: `La fecha de emisión debe pertenecer al ejercicio ${invoice.ejercicio}, que es el del número ${invoice.numero}.`,
            flag: Flag.PRECONDITION_FAILED,
          },
          HttpStatus.PRECONDITION_FAILED,
        );
      }
      invoice.fechaEmision = nueva;
    }

    // Los importes no llegan del DTO, pero se recalculan igualmente para que lo
    // guardado siempre cuadre con las líneas guardadas.
    const importes = this.calcularImportes(invoice.lineas, invoice.tipoIva);
    invoice.baseImponible = importes.baseImponible;
    invoice.cuotaIva = importes.cuotaIva;
    invoice.total = importes.total;

    const actualizada = await this.invoiceDAO.save(invoice);
    this.logger.log(`Factura actualizada: ${actualizada.numero}`);

    return actualizada;
  }

  /** Marca la factura como cobrada y registra la fecha del cobro. */
  async markAsPaid(id: number, dto: MarkInvoicePaidDto = {}): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.estado === InvoiceStatus.ANULADA) {
      throw new HttpException(
        {
          message: `La factura ${invoice.numero} está anulada y no puede marcarse como cobrada.`,
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    if (invoice.estado === InvoiceStatus.COBRADA) {
      throw new HttpException(
        {
          message: `La factura ${invoice.numero} ya figura como cobrada.`,
          flag: Flag.CONFLICT,
        },
        HttpStatus.CONFLICT,
      );
    }

    const fechaCobro = this.soloFecha(dto.fechaCobro) ?? this.hoy();
    if (fechaCobro < invoice.fechaEmision) {
      throw new HttpException(
        {
          message: `La fecha de cobro no puede ser anterior a la de emisión (${invoice.fechaEmision}).`,
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    invoice.estado = InvoiceStatus.COBRADA;
    invoice.fechaCobro = fechaCobro;
    if (dto.notas !== undefined) invoice.notas = dto.notas;

    const cobrada = await this.invoiceDAO.save(invoice);
    this.logger.log(`Factura cobrada: ${cobrada.numero} el ${cobrada.fechaCobro}`);

    return cobrada;
  }

  /**
   * Deshace el cobro y devuelve la factura a `emitida`, para el caso corriente
   * de haber marcado la fila equivocada. No toca el número ni los importes.
   */
  async revertPayment(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.estado !== InvoiceStatus.COBRADA) {
      throw new HttpException(
        {
          message: `La factura ${invoice.numero} no figura como cobrada.`,
          flag: Flag.PRECONDITION_FAILED,
        },
        HttpStatus.PRECONDITION_FAILED,
      );
    }

    invoice.estado = InvoiceStatus.EMITIDA;
    invoice.fechaCobro = null;

    const pendiente = await this.invoiceDAO.save(invoice);
    this.logger.log(`Cobro deshecho: ${pendiente.numero} vuelve a pendiente`);

    return pendiente;
  }

  /**
   * Anula la factura. El número se conserva (la numeración es correlativa y no
   * admite huecos), pero deja de computar en los totales del periodo.
   */
  async cancel(id: number): Promise<Invoice> {
    const invoice = await this.findOne(id);

    if (invoice.estado === InvoiceStatus.ANULADA) {
      throw new HttpException(
        {
          message: `La factura ${invoice.numero} ya está anulada.`,
          flag: Flag.CONFLICT,
        },
        HttpStatus.CONFLICT,
      );
    }

    invoice.estado = InvoiceStatus.ANULADA;
    invoice.fechaCobro = null;

    const anulada = await this.invoiceDAO.save(invoice);
    this.logger.log(`Factura anulada: ${anulada.numero}`);

    return anulada;
  }

  /**
   * Una factura emitida NO se borra.
   *
   * Cada factura consume un número del correlativo en el momento de emitirse, y
   * borrar la fila quemaba ese número para siempre: así es como la demo llegó a
   * tener el contador en 17 con seis facturas. Además, en España una factura
   * emitida no se elimina: se anula (conservando su número) y, si procede, se
   * emite una rectificativa. El endpoint se mantiene para responder con este
   * motivo en lugar de con un 404.
   */
  async remove(id: number): Promise<void> {
    const invoice = await this.findOne(id);

    throw new HttpException(
      {
        message: `La factura ${invoice.numero} no se puede eliminar: su número forma parte del correlativo. Anúlala; una factura anulada conserva su número y deja de contar en los totales.`,
        flag: Flag.PRECONDITION_FAILED,
      },
      HttpStatus.PRECONDITION_FAILED,
    );
  }

  // =========================================================================
  // PDF
  // =========================================================================

  /** Genera el PDF de la factura junto al nombre de fichero sugerido. */
  async generatePdf(id: number): Promise<{ buffer: Buffer; fileName: string }> {
    const invoice = await this.findOne(id);
    const buffer = await this.invoicePdfService.generate(invoice);

    return { buffer, fileName: this.invoicePdfService.buildFileName(invoice) };
  }

  // =========================================================================
  // Utilidades internas
  // =========================================================================

  /**
   * Reserva el siguiente número correlativo del ejercicio dentro de la
   * transacción en curso.
   */
  private async reservarNumero(
    manager: EntityManager,
    fechaEmision: string,
  ): Promise<{ numero: string; ejercicio: number; secuencia: number }> {
    const ejercicio = Number(fechaEmision.slice(0, 4));

    await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
      CLAVE_BLOQUEO_NUMERACION,
      ejercicio,
    ]);

    let contador = await manager.findOne(InvoiceSequence, { where: { ejercicio } });
    if (!contador) {
      contador = manager.create(InvoiceSequence, { ejercicio, ultimoNumero: 0 });
    }

    contador.ultimoNumero += 1;
    await manager.save(InvoiceSequence, contador);

    const secuencia = contador.ultimoNumero;
    const numero = `${PREFIJO_FACTURA}-${ejercicio}-${String(secuencia).padStart(
      DIGITOS_CORRELATIVO,
      '0',
    )}`;

    return { numero, ejercicio, secuencia };
  }

  /** Calcula el importe de cada línea a partir de cantidad y precio unitario. */
  private calcularLineas(lineas: InvoiceLineDto[] = []): IInvoiceLine[] {
    return lineas.map((linea) => {
      const cantidad = redondear(Number(linea.cantidad) || 0);
      const precioUnitario = redondear(Number(linea.precioUnitario) || 0);

      return {
        concepto: String(linea.concepto ?? '').trim(),
        cantidad,
        precioUnitario,
        importe: redondear(cantidad * precioUnitario),
      };
    });
  }

  /** Base imponible, cuota de IVA y total a partir de las líneas ya calculadas. */
  private calcularImportes(
    lineas: IInvoiceLine[],
    tipoIva: number,
  ): { baseImponible: number; cuotaIva: number; total: number } {
    const baseImponible = redondear(
      lineas.reduce((acumulado, linea) => acumulado + (linea.importe || 0), 0),
    );
    const cuotaIva = redondear((baseImponible * tipoIva) / 100);
    const total = redondear(baseImponible + cuotaIva);

    return { baseImponible, cuotaIva, total };
  }

  /** Tipo de IVA saneado. Por defecto el 21 %. */
  private normalizarTipoIva(tipoIva?: number): number {
    if (tipoIva === undefined || tipoIva === null || Number.isNaN(Number(tipoIva))) {
      return 21;
    }
    return redondear(Number(tipoIva));
  }

  /** Agrega los totales de una colección de facturas. */
  private agregarResumen(facturas: Invoice[]): IInvoiceSummary {
    const resumen: IInvoiceSummary = {
      numeroFacturas: facturas.length,
      baseImponible: 0,
      cuotaIva: 0,
      total: 0,
      totalCobrado: 0,
      totalPendiente: 0,
      totalAnulado: 0,
    };

    for (const factura of facturas) {
      if (factura.estado === InvoiceStatus.ANULADA) {
        resumen.totalAnulado += factura.total;
        continue;
      }

      resumen.baseImponible += factura.baseImponible;
      resumen.cuotaIva += factura.cuotaIva;
      resumen.total += factura.total;

      if (factura.estado === InvoiceStatus.COBRADA) {
        resumen.totalCobrado += factura.total;
      } else {
        resumen.totalPendiente += factura.total;
      }
    }

    resumen.baseImponible = redondear(resumen.baseImponible);
    resumen.cuotaIva = redondear(resumen.cuotaIva);
    resumen.total = redondear(resumen.total);
    resumen.totalCobrado = redondear(resumen.totalCobrado);
    resumen.totalPendiente = redondear(resumen.totalPendiente);
    resumen.totalAnulado = redondear(resumen.totalAnulado);

    return resumen;
  }

  /** Filtros comunes al listado y al resumen de totales. */
  private aplicarFiltros(
    qb: SelectQueryBuilder<Invoice>,
    dto: FindAllInvoiceDto,
  ): void {
    if (dto.estado) {
      qb.andWhere('invoice.estado = :estado', { estado: dto.estado });
    }
    if (dto.clienteId) {
      qb.andWhere('invoice.clienteId = :clienteId', { clienteId: dto.clienteId });
    }
    if (dto.contratoId) {
      qb.andWhere('invoice.contratoId = :contratoId', { contratoId: dto.contratoId });
    }
    if (dto.search) {
      qb.andWhere(
        '(invoice.numero ILIKE :search OR invoice.clienteNombre ILIKE :search)',
        { search: `%${dto.search}%` },
      );
    }
    const desde = this.soloFecha(dto.fechaDesde);
    if (desde) {
      qb.andWhere('invoice.fechaEmision >= :fechaDesde', { fechaDesde: desde });
    }
    const hasta = this.soloFecha(dto.fechaHasta);
    if (hasta) {
      qb.andWhere('invoice.fechaEmision <= :fechaHasta', { fechaHasta: hasta });
    }
  }

  /**
   * Precarga datos de un contrato para la generación de factura.
   *
   * El dominio `contracts/` lo desarrolla otro módulo, así que la lectura es
   * deliberadamente tolerante: si la tabla todavía no existe o sus columnas se
   * llaman de otro modo, se devuelve lo que se haya podido reconocer y el resto
   * llega desde el formulario. Nunca lanza: la precarga es una comodidad, no un
   * requisito.
   *
   * El importe NO es una columna de `contracts`: vive dentro del `jsonb` `datos`
   * y escrito en formato español (`precioMensualCifra: "1.850"`), que es de
   * donde lo saca `CLAVES_IMPORTE_CONTRATO`.
   */
  private async precargarDesdeContrato(
    contratoId: number,
  ): Promise<IContractPrefill> {
    const fila = await this.leerContrato(contratoId);
    if (!fila) return {};

    const datos =
      fila.datos && typeof fila.datos === 'object'
        ? (fila.datos as Record<string, unknown>)
        : {};

    const texto = (
      origen: Record<string, unknown>,
      claves: string[],
    ): string | undefined => {
      const valor = this.primerValor(origen, claves);
      return valor === undefined ? undefined : String(valor).trim() || undefined;
    };

    return {
      clienteId: parsearImporte(this.primerValor(fila, ['clienteId', 'clientId'])),
      clienteNombre: texto(fila, ['clienteNombre', 'clientName', 'cliente']),
      contratoReferencia: texto(fila, ['referencia', 'numero', 'codigo', 'titulo']),
      concepto: texto(fila, ['titulo', 'concepto', 'descripcion', 'tipo']),
      importe:
        parsearImporte(this.primerValor(datos, CLAVES_IMPORTE_CONTRATO)) ??
        parsearImporte(this.primerValor(fila, CLAVES_IMPORTE_CONTRATO)),
    };
  }

  /** Lee la fila del contrato si la tabla `contracts` ya existe. */
  private async leerContrato(
    contratoId: number,
  ): Promise<Record<string, unknown> | null> {
    return this.leerFila('contracts', contratoId);
  }

  /**
   * Datos fiscales del cliente para el bloque «Facturar a».
   *
   * Se leen de la tabla `clients` con la misma tolerancia que el contrato: si el
   * dominio de clientes cambia sus columnas, la factura se emite con lo que haya
   * en el formulario en vez de fallar.
   */
  private async datosFiscalesCliente(
    clienteId?: number,
  ): Promise<IClientFiscalData> {
    if (!clienteId) return {};

    const fila = await this.leerFila('clients', clienteId);
    if (!fila) return {};

    const texto = (claves: string[]): string | undefined => {
      const valor = this.primerValor(fila, claves);
      return valor === undefined ? undefined : String(valor).trim() || undefined;
    };

    const nombre = [texto(['nombre']), texto(['apellidos'])]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      nombre: nombre || texto(['razonSocial', 'clienteNombre']),
      documento: texto(['documento', 'nif', 'cif', 'dni']),
      direccion: texto(['direccion', 'domicilio', 'direccionFiscal']),
      email: texto(['email', 'correo']),
    };
  }

  /**
   * Lectura defensiva de una fila de otro dominio por su identificador. El
   * nombre de tabla siempre es un literal de este mismo servicio.
   */
  private async leerFila(
    tabla: string,
    id: number,
  ): Promise<Record<string, unknown> | null> {
    try {
      const existe: Array<{ tabla: string | null }> = await this.dataSource.query(
        `SELECT to_regclass('public.${tabla}')::text AS tabla`,
      );
      if (!existe?.[0]?.tabla) return null;

      const filas: Array<Record<string, unknown>> = await this.dataSource.query(
        `SELECT * FROM ${tabla} WHERE id = $1 LIMIT 1`,
        [id],
      );

      return filas?.[0] ?? null;
    } catch (error) {
      this.logger.warn(
        `No se pudo leer ${tabla} #${id}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      return null;
    }
  }

  /** Primer valor no vacío de la fila entre una lista de posibles columnas. */
  private primerValor(
    fila: Record<string, unknown>,
    claves: string[],
  ): unknown | undefined {
    for (const clave of claves) {
      const valor = fila[clave];
      if (valor !== null && valor !== undefined && valor !== '') return valor;
    }
    return undefined;
  }

  /** Normaliza una fecha ISO a `YYYY-MM-DD`. */
  private soloFecha(valor?: string | null): string | undefined {
    if (!valor) return undefined;
    return String(valor).slice(0, 10);
  }

  /** Fecha de hoy en horario local, en formato `YYYY-MM-DD`. */
  private hoy(): string {
    const ahora = new Date();
    const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }
}
