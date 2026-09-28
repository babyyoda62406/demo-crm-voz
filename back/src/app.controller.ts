import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Flag } from './common/enums/flag.enum';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio' })
  @ApiResponse({ status: 200, description: 'El servicio está operativo' })
  getHealth() {
    return {
      message: 'CRMIA API operativa',
      flag: Flag.SUCCESS,
      data: this.appService.getHealth(),
    };
  }
}
