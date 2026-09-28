import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ImporteEntrante } from './importe-entrante.decorator';

/** Línea de detalle recibida al crear o actualizar una factura. */
export class InvoiceLineDto {
  @ApiProperty({ example: 'Honorarios de búsqueda de inversión (PSI)' })
  @IsString()
  @IsNotEmpty({ message: 'El concepto de la línea es obligatorio' })
  concepto: string;

  @ApiProperty({ example: 1 })
  @ImporteEntrante()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'La cantidad debe ser un número' })
  @Min(0, { message: 'La cantidad no puede ser negativa' })
  cantidad: number;

  @ApiProperty({
    example: 3500,
    description: 'Admite «1.234,56» (español) y «1234.56» (anglosajón)',
  })
  @ImporteEntrante()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El precio unitario debe ser un número' },
  )
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  precioUnitario: number;
}
