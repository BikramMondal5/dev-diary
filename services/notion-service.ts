import { Client } from '@notionhq/client';

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export class NotionService {
  private client: Client;
  private databaseId: string;

  constructor(config: NotionConfig) {
    this.client = new Client({ auth: config.apiKey });
    this.databaseId = config.databaseId;
  }

  /**
   * Creates a new page in the specified Notion database with the dev diary content
   */
  async createDiaryEntry(title: string, markdownContent: string, tags: string[] = []): Promise<string> {
    try {
      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
          // Assuming the database has a Tags multi-select property
          Tags: {
            multi_select: tags.map(tag => ({ name: tag })),
          },
          // Assuming the database has a Date property
          Date: {
            date: {
              start: new Date().toISOString(),
            },
          },
        },
        // Add the diary content as rich text in the page content
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: 'Developer Diary Entry',
                    link: null,
                  },
                  annotations: {
                    bold: true,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: 'default',
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: markdownContent,
                  },
                },
              ],
            },
          },
        ],
      });

      return response.url;
    } catch (error) {
      console.error('Error creating Notion diary entry:', error);
      throw new Error(`Failed to create Notion diary entry: ${error}`);
    }
  }

  /**
   * Gets the most recent diary entries from the database
   */
  async getRecentEntries(limit: number = 5): Promise<Array<{ id: string; title: string; url: string; date: string }>> {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        sorts: [
          {
            property: 'Date',
            direction: 'descending',
          },
        ],
        page_size: limit,
      });

      return response.results.map(page => {
        const titleProperty = page.properties.title || page.properties.Name || page.properties.Title;
        const dateProperty = page.properties.Date;

        return {
          id: page.id,
          title: titleProperty?.title?.[0]?.plain_text || 'Untitled',
          url: page.url,
          date: dateProperty?.date?.start || new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error('Error fetching Notion diary entries:', error);
      throw new Error(`Failed to fetch Notion diary entries: ${error}`);
    }
  }
}

export default NotionService;