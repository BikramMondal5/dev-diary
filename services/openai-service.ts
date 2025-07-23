import OpenAI from 'openai';
import { encode } from 'gpt-tokenizer';

export interface ActivityData {
  snippets: {
    code: string;
    language: string;
    tags: string[];
    project: string;
    timestamp: string;
  }[];
  notes?: string[];
  decisions?: string[];
  tasks?: { title: string; completed: boolean }[];
  gitActivity?: {
    commits: { message: string; timestamp: string }[];
    branches: string[];
    pullRequests: { title: string; status: string }[];
  };
}

export class OpenAIService {
  private openai: OpenAI;
  private maxTokens = 16000; // Default for gpt-4-turbo

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Summarizes developer activities into a markdown diary
   */
  async generateDiaryContent(activityData: ActivityData): Promise<string> {
    // Count tokens to ensure we're within limit
    const activityJson = JSON.stringify(activityData);
    const tokenCount = encode(activityJson).length;
    
    if (tokenCount > this.maxTokens * 0.7) {
      // If too many tokens, truncate snippets and other data
      console.warn(`Activity data too large (${tokenCount} tokens), truncating...`);
      activityData = this.truncateActivityData(activityData);
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert developer diary assistant. Your task is to summarize the developer's daily 
            activities, code snippets, decisions, and other information into a clean, well-structured markdown diary.
            The diary should include:
            1. A title with the current date
            2. A brief executive summary of the day's work
            3. Code highlights with proper markdown formatting and syntax highlighting
            4. Key decisions and their rationale
            5. Challenges faced and solutions implemented
            6. Next steps or plans for tomorrow
            Use a professional but conversational tone. Format the diary in a way that's easy to read and well-organized.`
          },
          {
            role: 'user',
            content: `Please create a developer diary entry based on the following activity data: ${JSON.stringify(activityData)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
      
      return response.choices[0].message.content || 'Failed to generate diary content';
    } catch (error) {
      console.error('Error generating diary content:', error);
      throw new Error('Failed to generate diary content');
    }
  }
  
  /**
   * Truncates activity data to fit within token limits
   */
  private truncateActivityData(data: ActivityData): ActivityData {
    const truncated = {...data};
    
    // Keep only the first 5 snippets and truncate long code blocks
    if (truncated.snippets && truncated.snippets.length > 5) {
      truncated.snippets = truncated.snippets.slice(0, 5).map(snippet => ({
        ...snippet,
        code: snippet.code.length > 1000 ? snippet.code.substring(0, 1000) + '...' : snippet.code
      }));
    }
    
    // Truncate other data as needed
    if (truncated.notes && truncated.notes.length > 10) {
      truncated.notes = truncated.notes.slice(0, 10);
    }
    
    if (truncated.gitActivity?.commits && truncated.gitActivity.commits.length > 10) {
      truncated.gitActivity.commits = truncated.gitActivity.commits.slice(0, 10);
    }
    
    return truncated;
  }
  
  /**
   * Enhances an existing diary with additional insights
   */
  async enhanceDiaryContent(diaryContent: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert developer diary assistant. Your task is to enhance the provided developer diary
            by adding valuable insights, better organization, and professional polish. Consider:
            1. Adding helpful section headers if missing
            2. Suggesting optimizations or best practices based on code snippets
            3. Highlighting potential areas for future improvement
            4. Adding context to technical decisions
            Maintain the original content and facts, only enhance the presentation and add insights.`
          },
          {
            role: 'user',
            content: `Please enhance the following developer diary: ${diaryContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });
      
      return response.choices[0].message.content || diaryContent;
    } catch (error) {
      console.error('Error enhancing diary content:', error);
      return diaryContent; // Return original content if enhancement fails
    }
  }
}

export default OpenAIService;