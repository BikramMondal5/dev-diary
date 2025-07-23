import { Octokit } from '@octokit/rest';

export interface GistConfig {
  githubToken: string;
  filename?: string; // Optional custom filename
}

export class GitHubService {
  private octokit: Octokit;
  private defaultFilename: string;

  constructor(config: GistConfig) {
    this.octokit = new Octokit({
      auth: config.githubToken,
    });
    this.defaultFilename = config.filename || 'dev-diary.md';
  }

  /**
   * Creates a new private Gist with the diary content
   */
  async createGist(title: string, content: string, isPublic: boolean = false): Promise<{ url: string; id: string }> {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}-${this.defaultFilename}`;

      const response = await this.octokit.gists.create({
        description: title,
        public: isPublic,
        files: {
          [filename]: {
            content: content,
          },
        },
      });

      return {
        url: response.data.html_url,
        id: response.data.id,
      };
    } catch (error) {
      console.error('Error creating GitHub Gist:', error);
      throw new Error(`Failed to create GitHub Gist: ${error}`);
    }
  }

  /**
   * Updates an existing Gist with new content
   */
  async updateGist(gistId: string, content: string, filename?: string): Promise<{ url: string }> {
    try {
      const useFilename = filename || this.defaultFilename;

      const response = await this.octokit.gists.update({
        gist_id: gistId,
        files: {
          [useFilename]: {
            content: content,
          },
        },
      });

      return {
        url: response.data.html_url,
      };
    } catch (error) {
      console.error('Error updating GitHub Gist:', error);
      throw new Error(`Failed to update GitHub Gist: ${error}`);
    }
  }

  /**
   * Lists recent Gists created by the authenticated user
   */
  async getRecentGists(limit: number = 5): Promise<Array<{ id: string; description: string; url: string; created_at: string }>> {
    try {
      const response = await this.octokit.gists.list({
        per_page: limit,
      });

      return response.data.map(gist => ({
        id: gist.id,
        description: gist.description || 'No description',
        url: gist.html_url,
        created_at: gist.created_at,
      }));
    } catch (error) {
      console.error('Error fetching GitHub Gists:', error);
      throw new Error(`Failed to fetch GitHub Gists: ${error}`);
    }
  }

  /**
   * Gets a specific Gist's content
   */
  async getGistContent(gistId: string): Promise<{ content: string; filename: string }> {
    try {
      const response = await this.octokit.gists.get({
        gist_id: gistId,
      });

      const files = response.data.files;
      if (!files) {
        throw new Error('No files found in the Gist');
      }

      // Get the first file in the Gist
      const filename = Object.keys(files)[0];
      const content = files[filename]?.content || '';

      return {
        content,
        filename,
      };
    } catch (error) {
      console.error('Error fetching Gist content:', error);
      throw new Error(`Failed to fetch Gist content: ${error}`);
    }
  }
}

export default GitHubService;