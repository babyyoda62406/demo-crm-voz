import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { ContractTemplate } from './entities/contract-template.entity';
import { CONTRACT_TEMPLATES_SEED } from './seed/contract-templates.seed';
import { getTemplatePath } from './helpers/storage-paths.helper';
import { Flag } from '../common/enums/flag.enum';

/**
 * Catalogo de plantillas .docx.
 *
 * Al arrancar siembra (o actualiza) las cinco plantillas de contrato del despacho.
 * La definicion vive en `seed/contract-templates.seed.ts`; la BD solo guarda
 * una copia consultable por la API.
 */
@Injectable()
export class ContractTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(ContractTemplatesService.name);

  constructor(
    @InjectRepository(ContractTemplate)
    private readonly templateDAO: Repository<ContractTemplate>,
  ) {}

  async onModuleInit() {
    try {
      await this.seedTemplates();
    } catch (error) {
      // Un fallo aqui (BD aun levantandose) no debe tumbar el arranque.
      this.logger.error('No se pudieron sembrar las plantillas', error);
    }
  }

  /**
   * Inserta las plantillas que falten y actualiza las existentes con la
   * definicion de campos vigente. Es idempotente.
   */
  async seedTemplates(): Promise<void> {
    for (const semilla of CONTRACT_TEMPLATES_SEED) {
      const existente = await this.templateDAO.findOne({
        where: { key: semilla.key },
      });

      const datos: Partial<ContractTemplate> = {
        key: semilla.key,
        nombre: semilla.nombre,
        descripcion: semilla.descripcion,
        archivo: semilla.archivo,
        categoria: semilla.categoria,
        icono: semilla.icono,
        orden: semilla.orden,
        campos: semilla.campos,
        admiteProrroga: semilla.admiteProrroga ?? false,
        plantillaProrroga: semilla.plantillaProrroga ?? null,
        activo: fs.existsSync(getTemplatePath(semilla.archivo)),
      };

      if (!datos.activo) {
        this.logger.warn(
          `La plantilla "${semilla.key}" queda inactiva: falta el fichero ${semilla.archivo}`,
        );
      }

      if (existente) {
        await this.templateDAO.update(existente.id, datos);
      } else {
        await this.templateDAO.save(this.templateDAO.create(datos));
      }
    }

    this.logger.log(
      `Plantillas de contrato sincronizadas: ${CONTRACT_TEMPLATES_SEED.length}`,
    );
  }

  /** Devuelve todas las plantillas ordenadas para el asistente de creacion. */
  async findAll(): Promise<ContractTemplate[]> {
    return await this.templateDAO.find({
      order: { orden: 'asc', id: 'asc' },
    });
  }

  /** Devuelve una plantilla por su clave. Lanza 404 si no existe. */
  async findByKey(key: string): Promise<ContractTemplate> {
    const plantilla = await this.templateDAO.findOne({ where: { key } });

    if (!plantilla) {
      throw new HttpException(
        {
          message: `No existe la plantilla de contrato "${key}"`,
          flag: Flag.NOT_FOUND,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return plantilla;
  }
}
