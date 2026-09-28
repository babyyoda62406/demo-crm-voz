import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: 'CRMIA API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
