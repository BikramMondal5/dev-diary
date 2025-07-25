// Use dynamic import for Node-specific modules
let TelegramBot: any;

// Only import in server environment
if (typeof window === 'undefined') {
  // This code only runs on the server
  TelegramBot = require('node-telegram-bot-api');
}

export interface TelegramConfig {
  token: string;
  chatId: string;
}

export class TelegramService {
  private bot: any;
  private chatId: string;
  private isServer: boolean;

  constructor(config: TelegramConfig) {
    this.chatId = config.chatId;
    // Check if we're in a server environment
    this.isServer = typeof window === 'undefined';

    if (this.isServer && TelegramBot) {
      this.bot = new TelegramBot(config.token, { polling: false });
    }
  }

  /**
   * Sends a text message notification
   */
  async sendMessage(message: string): Promise<boolean> {
    if (!this.isServer || !this.bot) {
      console.warn('Telegram service can only be used on the server side');
      return false;
    }

    try {
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });
      return true;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  }

  /**
   * Sends a diary summary with links
   */
  async sendDiarySummary(title: string, summary: string, links: { title: string; url: string }[]): Promise<boolean> {
    if (!this.isServer || !this.bot) {
      console.warn('Telegram service can only be used on the server side');
      return false;
    }
    
    try {
      const linksText = links.map(link => `[${link.title}](${link.url})`).join('\n');
      
      const message = `
*${title}*

${summary}

*Links:*
${linksText}
`;
      
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      });
      
      return true;
    } catch (error) {
      console.error('Error sending Telegram diary summary:', error);
      return false;
    }
  }
}

export default TelegramService;