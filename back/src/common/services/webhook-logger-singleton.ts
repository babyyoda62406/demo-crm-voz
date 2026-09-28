import axios from 'axios';
import { getEnvConfig } from '../../env/envs';

class WebhookLoggerSingleton {
  private env = getEnvConfig();

  async sendLog(logData: any): Promise<void> {
    if (!this.env.ENABLE_WEBHOOK_LOGS || !this.env.WEBHOOK_URL) {
      return;
    }

    try {
      await axios.post(this.env.WEBHOOK_URL, logData, {
        timeout: 5000,
      });
    } catch (error) {
      // Fallo silencioso: el log nunca debe tumbar la peticion
    }
  }
}

export const webhookLoggerSingleton = new WebhookLoggerSingleton();
