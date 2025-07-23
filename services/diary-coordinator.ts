import { format } from 'date-fns';
import { simpleGit, SimpleGit } from 'simple-git';
import MarkdownIt from 'markdown-it';

import GeminiService, { ActivityData } from './gemini-service';
import NotionService from './notion-service';
import GitHubService from './github-service';
import TelegramService from './telegram-service';
import PiecesService from './pieces-service';

export interface DiaryCoordinatorConfig {
  geminiApiKey: string;
  notionConfig?: {
    apiKey: string;
    databaseId: string;
  };
  githubConfig?: {
    githubToken: string;
  };
  telegramConfig?: {
    token: string;
    chatId: string;
  };
  piecesConfig?: {
    baseUrl?: string;
    apiKey?: string;
  };
  repositoryPath?: string;
}

export class DiaryCoordinator {
  private geminiService: GeminiService;
  private notionService?: NotionService;
  private githubService?: GitHubService;
  private telegramService?: TelegramService;
  private piecesService?: PiecesService;
  private git?: SimpleGit;
  private markdown: MarkdownIt;

  constructor(config: DiaryCoordinatorConfig) {
    this.geminiService = new GeminiService(config.geminiApiKey);
    
    if (config.notionConfig) {
      this.notionService = new NotionService(config.notionConfig);
    }
    
    if (config.githubConfig) {
      this.githubService = new GitHubService(config.githubConfig);
    }
    
    if (config.telegramConfig) {
      this.telegramService = new TelegramService(config.telegramConfig);
    }
    
    if (config.piecesConfig) {
      this.piecesService = new PiecesService(config.piecesConfig);
    }
    
    if (config.repositoryPath) {
      this.git = simpleGit(config.repositoryPath);
    }
    
    this.markdown = new MarkdownIt();
  }

  /**
   * Collects all developer activities from various sources
   */
  async collectActivities(): Promise<ActivityData> {
    const activities: ActivityData = {
      snippets: [],
      notes: [],
      decisions: [],
      tasks: [],
      gitActivity: {
        commits: [],
        branches: [],
        pullRequests: [],
      },
    };

    try {
      // Collect snippets from Pieces if available
      if (this.piecesService) {
        const todaySnippets = await this.piecesService.getTodaySnippets();
        activities.snippets = this.piecesService.transformSnippetsToActivityData(todaySnippets);
      }

      // Collect git activity if available
      if (this.git) {
        // Get today's commits
        const today = format(new Date(), 'yyyy-MM-dd');
        const gitLogs = await this.git.log({ from: today });
        
        activities.gitActivity = {
          commits: gitLogs.all.map(commit => ({
            message: commit.message,
            timestamp: new Date(commit.date).toISOString(),
          })),
          branches: [],
          pullRequests: [],
        };
        
        // Get branches
        const branches = await this.git.branch();
        activities.gitActivity.branches = branches.all;
      }

      return activities;
    } catch (error) {
      console.error('Error collecting activities:', error);
      return activities;
    }
  }

  /**
   * Generates the developer diary using the AI service
   */
  async generateDiary(customActivities?: ActivityData): Promise<{
    title: string;
    markdown: string;
    html: string;
  }> {
    try {
      // Collect activities or use provided ones
      const activities = customActivities || await this.collectActivities();
      
      // Generate diary content using Gemini
      const diaryMarkdown = await this.geminiService.generateDiaryContent(activities);
      
      // Enhance the diary with additional insights
      const enhancedDiary = await this.geminiService.enhanceDiaryContent(diaryMarkdown);
      
      // Convert markdown to HTML
      const diaryHtml = this.markdown.render(enhancedDiary);
      
      // Extract title from the markdown (assuming first line is a heading)
      const titleMatch = enhancedDiary.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : `Dev Diary - ${format(new Date(), 'yyyy-MM-dd')}`;
      
      return {
        title,
        markdown: enhancedDiary,
        html: diaryHtml,
      };
    } catch (error) {
      console.error('Error generating diary:', error);
      throw new Error(`Failed to generate diary: ${error}`);
    }
  }

  /**
   * Publishes the generated diary to all configured integrations
   */
  async publishDiary(diary: { title: string; markdown: string; html: string }): Promise<{
    notion?: { url: string };
    github?: { url: string; id: string };
    telegram?: boolean;
  }> {
    const results: {
      notion?: { url: string };
      github?: { url: string; id: string };
      telegram?: boolean;
    } = {};

    try {
      // Publish to Notion if configured
      if (this.notionService) {
        const url = await this.notionService.createDiaryEntry(
          diary.title,
          diary.markdown,
          // Extract tags from markdown (e.g., any words with # prefix)
          diary.markdown.match(/(?<!\S)#([a-zA-Z0-9-_]+)/g)?.map(tag => tag.substring(1)) || []
        );
        results.notion = { url };
      }

      // Publish to GitHub Gist if configured
      if (this.githubService) {
        const { url, id } = await this.githubService.createGist(
          diary.title,
          diary.markdown,
          false // private by default
        );
        results.github = { url, id };
      }

      // Send notification via Telegram if configured
      if (this.telegramService) {
        // Create a summary (first paragraph or first 200 chars)
        const summary = diary.markdown.split('\n\n')[1]?.substring(0, 200) + '...' || 'Developer diary created';
        
        // Collect all links to include
        const links = [];
        if (results.notion) links.push({ title: 'View in Notion', url: results.notion.url });
        if (results.github) links.push({ title: 'View GitHub Gist', url: results.github.url });
        
        const success = await this.telegramService.sendDiarySummary(
          diary.title,
          summary,
          links
        );
        
        results.telegram = success;
      }

      return results;
    } catch (error) {
      console.error('Error publishing diary:', error);
      return results; // Return partial results even if some publishing failed
    }
  }

  /**
   * Complete workflow: collect, generate, and publish diary
   */
  async createAndPublishDiary(): Promise<{
    diary: { title: string; markdown: string; html: string };
    publishResults: {
      notion?: { url: string };
      github?: { url: string; id: string };
      telegram?: boolean;
    };
  }> {
    // Collect activities
    const activities = await this.collectActivities();
    
    // Generate diary
    const diary = await this.generateDiary(activities);
    
    // Publish diary
    const publishResults = await this.publishDiary(diary);
    
    return {
      diary,
      publishResults,
    };
  }
}

export default DiaryCoordinator;