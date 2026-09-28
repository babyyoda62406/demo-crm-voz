import { PartialType } from '@nestjs/mapped-types';
import { CreateFileDocDto } from './create-file-doc.dto';

/** Renombrado y revinculacion de un fichero ya subido. */
export class UpdateFileDocDto extends PartialType(CreateFileDocDto) {}
