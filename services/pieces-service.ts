import { Configuration, ConnectorApi, FlattenedAssets, PiecesApi, PortsApi } from '@pieces/pieces-os-client';

export interface PiecesConfig {
  baseUrl?: string;
  apiKey?: string;
}

export class PiecesService {
  private piecesApi: PiecesApi;
  private connectorApi: ConnectorApi;
  private portsApi: PortsApi;

  constructor(config: PiecesConfig = {}) {
    const configuration = new Configuration({
      apiKey: config.apiKey,
      basePath: config.baseUrl || 'http://localhost:1000',
    });

    this.piecesApi = new PiecesApi(configuration);
    this.connectorApi = new ConnectorApi(configuration);
    this.portsApi = new PortsApi(configuration);
  }

  /**
   * Saves a code snippet to Pieces
   */
  async saveSnippet(
    code: string,
    language: string,
    title: string,
    tags: string[] = [],
    project?: string
  ): Promise<string> {
    try {
      // Create the asset (snippet)
      const response = await this.piecesApi.assetsCreateNewAsset({
        asset: {
          name: title,
          format: {
            syntax_highlight: language.toLowerCase(),
          },
          original: code,
          tags: tags.map(tag => ({
            text: tag,
          })),
          metadata: {
            custom: project ? [{ key: 'project', value: project }] : [],
          },
        },
      });

      return response.asset?.id || '';
    } catch (error) {
      console.error('Error saving snippet to Pieces:', error);
      throw new Error(`Failed to save snippet to Pieces: ${error}`);
    }
  }

  /**
   * Retrieves all snippets from Pieces
   */
  async getAllSnippets(): Promise<FlattenedAssets> {
    try {
      const response = await this.piecesApi.assetsSnapshot({});
      return response.iterable || { iterable: [] };
    } catch (error) {
      console.error('Error retrieving snippets from Pieces:', error);
      throw new Error(`Failed to retrieve snippets from Pieces: ${error}`);
    }
  }

  /**
   * Retrieves snippets created/modified today
   */
  async getTodaySnippets(): Promise<FlattenedAssets> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const allSnippets = await this.getAllSnippets();
      
      // Filter snippets created or modified today
      const todaySnippets = {
        iterable: allSnippets.iterable.filter(snippet => {
          const created = snippet.created?.milliseconds || 0;
          const updated = snippet.updated?.milliseconds || 0;
          return created >= todayTimestamp || updated >= todayTimestamp;
        }),
      };

      return todaySnippets;
    } catch (error) {
      console.error('Error retrieving today\'s snippets from Pieces:', error);
      throw new Error(`Failed to retrieve today's snippets from Pieces: ${error}`);
    }
  }

  /**
   * Transforms Pieces snippets to our ActivityData format
   */
  transformSnippetsToActivityData(snippets: FlattenedAssets) {
    return snippets.iterable.map(snippet => {
      const language = snippet.format?.syntax_highlight || 'text';
      const project = snippet.metadata?.custom?.find(item => item.key === 'project')?.value || 'Unknown';
      
      return {
        code: snippet.original || '',
        language: language,
        tags: snippet.tags?.map(tag => tag.text || '') || [],
        project: project,
        timestamp: new Date(snippet.created?.milliseconds || Date.now()).toISOString(),
      };
    });
  }

  /**
   * Analyzes snippets to extract insights
   */
  async analyzeSnippets(snippets: FlattenedAssets): Promise<{
    languages: { [key: string]: number };
    projects: { [key: string]: number };
    topTags: string[];
  }> {
    const analysis = {
      languages: {} as { [key: string]: number },
      projects: {} as { [key: string]: number },
      topTags: [] as string[],
    };

    // Count languages
    snippets.iterable.forEach(snippet => {
      const language = snippet.format?.syntax_highlight || 'text';
      analysis.languages[language] = (analysis.languages[language] || 0) + 1;

      // Count projects
      const project = snippet.metadata?.custom?.find(item => item.key === 'project')?.value || 'Unknown';
      analysis.projects[project] = (analysis.projects[project] || 0) + 1;
    });

    // Collect all tags and count occurrences
    const tagCounts: { [key: string]: number } = {};
    snippets.iterable.forEach(snippet => {
      snippet.tags?.forEach(tag => {
        if (tag.text) {
          tagCounts[tag.text] = (tagCounts[tag.text] || 0) + 1;
        }
      });
    });

    // Sort tags by occurrence count and take top 10
    analysis.topTags = Object.entries(tagCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 10)
      .map(([tag]) => tag);

    return analysis;
  }
}

export default PiecesService;