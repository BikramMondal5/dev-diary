import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

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

export class GeminiService {
  private gemini: GoogleGenerativeAI;
  private model: string = 'gemini-1.5-flash-latest'; // Using Gemini 2.0 Flash for best performance

  constructor(apiKey: string) {
    this.gemini = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Summarizes developer activities into a markdown diary
   */
  async generateDiaryContent(activityData: ActivityData): Promise<string> {
    // Simplify by directly using the activity data
    const activityJson = JSON.stringify(activityData);
    
    try {
      // Get the generative model
      const model = this.gemini.getGenerativeModel({ model: this.model });
      
      const systemPrompt = `You are an expert developer diary assistant. Your task is to summarize the developer's daily 
      activities, code snippets, decisions, and other information into a clean, well-structured markdown diary.
      The diary should include:
      1. A title with the current date
      2. A brief executive summary of the day's work
      3. Code highlights with proper markdown formatting and syntax highlighting
      4. Key decisions and their rationale
      5. Challenges faced and solutions implemented
      6. Next steps or plans for tomorrow
      Use a professional but conversational tone. Format the diary in a way that's easy to read and well-organized.`;

      const prompt = `${systemPrompt}\n\nPlease create a developer diary entry based on the following activity data: ${activityJson}`;

      // Configure safety settings
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
        safetySettings,
      });

      const response = result.response;
      return response.text();
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
      // Get the generative model
      const model = this.gemini.getGenerativeModel({ model: this.model });
      
      const systemPrompt = `You are an expert developer diary assistant. Your task is to enhance the provided developer diary
      by adding valuable insights, better organization, and professional polish. Consider:
      1. Adding helpful section headers if missing
      2. Suggesting optimizations or best practices based on code snippets
      3. Highlighting potential areas for future improvement
      4. Adding context to technical decisions
      Maintain the original content and facts, only enhance the presentation and add insights.`;

      const prompt = `${systemPrompt}\n\nPlease enhance the following developer diary: ${diaryContent}`;

      // Configure safety settings
      const safetySettings = [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ];

      // Generate content
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
        safetySettings,
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error enhancing diary content:', error);
      return diaryContent; // Return original content if enhancement fails
    }
  }
}

export default GeminiService;