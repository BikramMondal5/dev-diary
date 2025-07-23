import TelegramBot from 'node-telegram-bot-api';

export interface TelegramConfig {
  token: string;
  chatId: string;
}

export class TelegramService {
  private bot: TelegramBot;
  private chatId: string;

  constructor(config: TelegramConfig) {
    this.bot = new TelegramBot(config.token, { polling: false });
    this.chatId = config.chatId;
  }

  /**
   * Sends a text message notification
   */
  async sendMessage(message: string): Promise<boolean> {
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