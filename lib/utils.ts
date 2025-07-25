import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects programming language from code snippet
 * Uses keyword and syntax pattern matching
 */
export function detectLanguage(code: string): string | null {
  // Trimming and lowercasing for consistent checks
  const trimmedCode = code.trim().toLowerCase();

  // Language signatures to check
  const signatures = {
    JavaScript: {
      keywords: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "export",
        "import",
        "from",
        "=>",
      ],
      patterns: [
        /console\.log\(/,
        /const\s+\w+\s*=/,
        /function\s+\w+\s*\(/,
        /import\s+.*\s+from\s+/,
      ],
    },
    TypeScript: {
      keywords: [
        "interface",
        "type",
        "namespace",
        "readonly",
        "private",
        "public",
        "protected",
      ],
      patterns: [
        /:\s*string\b/,
        /:\s*number\b/,
        /:\s*boolean\b/,
        /<[\w\s,]+>/,
        /interface\s+\w+\s*\{/,
      ],
    },
    Python: {
      keywords: [
        "def",
        "class",
        "import",
        "from",
        "as",
        "with",
        "self",
        "if",
        "elif",
        "else",
      ],
      patterns: [
        /def\s+\w+\s*\(/,
        /class\s+\w+\s*:/,
        /if\s+.*:/,
        /import\s+\w+/,
        /#.*$/m,
      ],
    },
    HTML: {
      keywords: ["div", "span", "class", "href", "src"],
      patterns: [
        /<\/?[a-z][\s\S]*>/i,
        /<html/i,
        /<div/i,
        /<body/i,
        /<head/i,
      ],
    },
    CSS: {
      keywords: [
        "margin",
        "padding",
        "color",
        "background",
        "width",
        "height",
        "display",
      ],
      patterns: [/\{[\s\S]*\}/, /;\s*$/, /#[a-f0-9]{3,6}/i, /\.\w+\s*\{/],
    },
    SQL: {
      keywords: [
        "select",
        "from",
        "where",
        "join",
        "group by",
        "having",
        "order by",
        "insert",
        "update",
        "delete",
      ],
      patterns: [
        /select\s+.*\s+from/i,
        /create\s+table/i,
        /insert\s+into/i,
        /update\s+.*\s+set/i,
      ],
    },
    Java: {
      keywords: [
        "public",
        "private",
        "protected",
        "class",
        "interface",
        "extends",
        "implements",
        "void",
        "static",
      ],
      patterns: [
        /public\s+class/,
        /public\s+static\s+void\s+main/,
        /\w+\s+\w+\s*=\s*new\s+\w+/,
      ],
    },
    CSharp: {
      keywords: [
        "namespace",
        "using",
        "class",
        "var",
        "string",
        "int",
        "bool",
        "void",
        "async",
        "await",
      ],
      patterns: [/namespace\s+\w+/, /class\s+\w+/, /using\s+\w+;/, /\w+<\w+>/],
    },
    PHP: {
      keywords: [
        "function",
        "echo",
        "print",
        "require",
        "include",
        "namespace",
        "use",
        "$",
      ],
      patterns: [
        /<\?php/,
        /\$\w+\s*=/,
        /function\s+\w+\s*\(.*\)\s*\{/,
        /echo\s+/,
      ],
    },
    Ruby: {
      keywords: [
        "def",
        "end",
        "class",
        "module",
        "require",
        "include",
        "attr_accessor",
        "do",
      ],
      patterns: [
        /def\s+\w+/,
        /class\s+\w+/,
        /\w+\.each\s+do/,
        /attr_accessor\s+:\w+/,
      ],
    },
    Go: {
      keywords: [
        "func",
        "package",
        "import",
        "var",
        "const",
        "struct",
        "interface",
        "go",
        "chan",
        "defer",
      ],
      patterns: [
        /func\s+\w+\(/,
        /package\s+\w+/,
        /import\s+\([\s\S]*\)/,
        /type\s+\w+\s+struct/,
      ],
    },
    Rust: {
      keywords: [
        "fn",
        "let",
        "mut",
        "struct",
        "enum",
        "impl",
        "trait",
        "match",
        "use",
        "mod",
      ],
      patterns: [
        /fn\s+\w+\s*\(/,
        /let\s+mut\s+\w+/,
        /impl\s+\w+\s+for/,
        /use\s+\w+::\w+/,
      ],
    },
    JSON: {
      keywords: [],
      patterns: [
        /^\s*\{[\s\S]*\}\s*$/,
        /"[\w\s]+"\s*:\s*["{\[\d]/,
        /\[[\s\S]*\]/,
      ],
    },
    Markdown: {
      keywords: [],
      patterns: [
        /^#\s+.*$/m,
        /\*\*.*\*\*/,
        /\[.*\]\(.*\)/,
        /```[\s\S]*```/,
      ],
    },
  };

  // Check for language-specific file extensions at the beginning
  if (trimmedCode.startsWith("<?xml")) return "XML";
  if (trimmedCode.startsWith("<!doctype html")) return "HTML";
  if (trimmedCode.startsWith("<?php")) return "PHP";

  // Score each language
  const scores: Record<string, number> = {};

  // Initialize scores
  Object.keys(signatures).forEach((lang) => {
    scores[lang] = 0;
  });

  // Check keywords and patterns
  Object.entries(signatures).forEach(([lang, { keywords, patterns }]) => {
    // Check keywords
    keywords.forEach((keyword) => {
      if (trimmedCode.includes(keyword)) {
        scores[lang] += 1;
      }
    });

    // Check patterns
    patterns.forEach((pattern) => {
      if (pattern.test(trimmedCode)) {
        scores[lang] += 2;
      }
    });
  });

  // Add additional checks for specific cases

  // JavaScript vs TypeScript - TypeScript usually has type annotations
  if (scores.JavaScript > 0 && scores.TypeScript > 0) {
    if (/(:\s*\w+|<\w+>)/.test(trimmedCode)) {
      scores.TypeScript += 2;
    }
  }

  // JSON check - must be valid JSON format
  if (scores.JSON > 0) {
    try {
      JSON.parse(code);
      scores.JSON += 5; // Strong bonus if valid JSON
    } catch (e) {
      scores.JSON = 0; // Not valid JSON
    }
  }

  // Get the language with the highest score
  let detectedLang: string | null = null;
  let highestScore = 0;

  Object.entries(scores).forEach(([lang, score]) => {
    if (score > highestScore) {
      highestScore = score;
      detectedLang = lang;
    }
  });

  // Only return if score is above threshold
  return highestScore > 2 ? detectedLang : "Unknown";
}
