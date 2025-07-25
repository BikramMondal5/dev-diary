/**
 * Clipboard Service
 * 
 * This service monitors clipboard events and processes code snippets.
 * It detects when code is copied from external sources and adds it to the application's recent activity.
 */

import { detectLanguage } from '@/lib/utils';

export interface ClipboardSnippet {
  id: string;
  code: string;
  language: string;
  project: string;
  tags: string[];
  timestamp: string;
  source: string;
  enriched: boolean;
}

export interface ClipboardServiceOptions {
  onSnippetCopied?: (snippet: ClipboardSnippet) => void;
}

export class ClipboardService {
  private static instance: ClipboardService;
  private clipboardListeners: Array<(snippet: ClipboardSnippet) => void> = [];
  private isListening: boolean = false;
  private lastCopiedText: string = '';
  private onSnippetCopied?: (snippet: ClipboardSnippet) => void;
  
  // Constructor that accepts options
  constructor(options?: ClipboardServiceOptions) {
    this.onSnippetCopied = options?.onSnippetCopied;
    if (this.onSnippetCopied) {
      this.addListener(this.onSnippetCopied);
    }
  }

  // Get singleton instance
  public static getInstance(): ClipboardService {
    if (!ClipboardService.instance) {
      ClipboardService.instance = new ClipboardService();
    }
    return ClipboardService.instance;
  }

  // Start monitoring clipboard
  public start(): void {
    if (this.isListening || typeof window === 'undefined') return;
    
    this.isListening = true;
    
    // Set up event listener for paste events (for detecting code in clipboard)
    document.addEventListener('paste', this.handlePaste);
    
    // Set up focus/visibility change handlers to check clipboard
    document.addEventListener('visibilitychange', this.checkClipboardOnFocus);
    window.addEventListener('focus', this.checkClipboardOnFocus);
    
    console.log('Clipboard monitoring started');
  }

  // Stop monitoring clipboard
  public stop(): void {
    if (!this.isListening || typeof window === 'undefined') return;
    
    document.removeEventListener('paste', this.handlePaste);
    document.removeEventListener('visibilitychange', this.checkClipboardOnFocus);
    window.removeEventListener('focus', this.checkClipboardOnFocus);
    
    this.isListening = false;
    console.log('Clipboard monitoring stopped');
  }

  // Add listener for clipboard code events
  public addListener(listener: (snippet: ClipboardSnippet) => void): void {
    this.clipboardListeners.push(listener);
  }

  // Remove listener
  public removeListener(listener: (snippet: ClipboardSnippet) => void): void {
    this.clipboardListeners = this.clipboardListeners.filter(l => l !== listener);
  }
  
  // Check clipboard content when tab gains focus
  private checkClipboardOnFocus = async (): Promise<void> => {
    if (document.visibilityState === 'visible' && typeof navigator.clipboard !== 'undefined') {
      try {
        // Request clipboard read permission
        const text = await navigator.clipboard.readText();
        this.processClipboardContent(text);
      } catch (error) {
        // Permission denied or clipboard API not available
        console.log('Could not access clipboard:', error);
      }
    }
  };

  // Handle paste events
  private handlePaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text');
    if (text) {
      this.processClipboardContent(text);
    }
  };

  // Process clipboard content
  private processClipboardContent(text: string): void {
    // Skip if content is unchanged or not code-like
    if (text === this.lastCopiedText || !this.looksLikeCode(text)) return;
    
    this.lastCopiedText = text;
    
    // Create snippet from clipboard content
    const language = detectLanguage(text);
    const snippet: ClipboardSnippet = {
      id: `external-${Date.now()}`,
      code: text,
      language: language || 'Unknown',
      project: 'External Source',
      tags: [language?.toLowerCase() || 'code', 'external'],
      timestamp: new Date().toISOString(),
      source: 'External Clipboard',
      enriched: false
    };
    
    // Notify listeners
    this.clipboardListeners.forEach(listener => listener(snippet));
  }

  // Determine if text looks like code
  private looksLikeCode(text: string): boolean {
    if (text.length < 10 || text.length > 10000) return false; // Too short or too long
    
    // Check for code indicators
    const codeIndicators = [
      // Common syntax elements
      '{', '}', '()', '[]', '=>', '->', ';',
      // Programming keywords
      'function', 'return', 'const', 'let', 'var', 'class', 'import', 'export',
      'def', 'if', 'else', 'for', 'while', 'try', 'catch',
      // Indentation patterns (common in code)
      /\n\s+\w/.test(text),
      // Multiple lines with consistent indentation
      text.split('\n').length > 2
    ];
    
    // Count how many indicators are present
    const indicatorCount = codeIndicators.filter(indicator => {
      if (typeof indicator === 'string') {
        return text.includes(indicator);
      }
      return indicator; // Already a boolean from regex test
    }).length;
    
    // If more than 2 indicators, likely code
    return indicatorCount >= 2;
  }
}

export default ClipboardService;