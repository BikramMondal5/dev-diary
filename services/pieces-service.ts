import axios from 'axios';

export interface PiecesConfig {
  baseUrl?: string;
  apiKey?: string;
}

// Type definitions to replace those from the pieces-os-client package
export interface FlattenedAsset {
  id?: string;
  name?: string;
  original?: string;
  format?: {
    syntax_highlight?: string;
  };
  tags?: Array<{
    text?: string;
  }>;
  metadata?: {
    custom?: Array<{
      key: string;
      value: string;
    }>;
  };
  created?: {
    milliseconds: number;
  };
  updated?: {
    milliseconds: number;
  };
}

export interface FlattenedAssets {
  iterable: FlattenedAsset[];
}

export class PiecesService {
  private baseUrl: string;
  private apiKey?: string;
  private headers: Record<string, string>;

  constructor(config: PiecesConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:1000';
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
    };
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
      const response = await axios.post(
        `${this.baseUrl}/assets/create`, 
        {
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
        },
        { headers: this.headers }
      );

      return response.data?.asset?.id || '';
    } catch (error) {
      console.error('Error saving snippet to Pieces:', error);
      return ''; // Return empty string instead of throwing to avoid breaking the app
    }
  }

  /**
   * Retrieves all snippets from Pieces
   */
  async getAllSnippets(): Promise<FlattenedAssets> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/assets/snapshot`,
        { headers: this.headers }
      );
      return response.data?.iterable || { iterable: [] };
    } catch (error) {
      console.error('Error retrieving snippets from Pieces:', error);
      return { iterable: [] }; // Return empty array instead of throwing
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
      return { iterable: [] }; // Return empty array instead of throwing
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