"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { toast } from "@/hooks/use-toast"
import {
  Code2, Settings, Plus, Tag, FolderOpen, Edit3, Trash2, Sparkles, Download, RefreshCw, Filter,
  Moon, Sun, User, LogOut, Bell, Eye, EyeOff, Copy, Github, Webhook, BookOpen, SendToBack, MessageSquare,
  Calendar, AlertCircle, CheckCircle, XCircle, Loader2, Github as GithubIcon, BookText, Menu
} from "lucide-react"

import { cn } from "@/lib/utils"
import config from "@/lib/config"
import DiaryCoordinator from "@/services/diary-coordinator"
import { ActivityData } from "@/services/gemini-service"
import { useTheme } from "next-themes"
import ClipboardService, { ClipboardSnippet } from "@/services/clipboard-service"

// Mock data for development
const mockSnippets = [
  {
    id: 0,
    code: `{
  "mcpServers": {
    "sqlite": {
      "command": "python",
      "args": ["-m", "mcp_server.sqlite_server"],
      "env": {
        "DATABASE_PATH": "database.db"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      }
    }
  }
}`,
    language: "JSON",
    tags: ["json", "configuration", "mcp"],
    project: "MCP Server Config",
    timestamp: "2024-07-24T10:15:00Z",
    enriched: true,
  },
  {
    id: 1,
    code: `function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}`,
    language: "JavaScript",
    tags: ["function", "array", "calculation"],
    project: "E-commerce App",
    timestamp: "2024-01-15T10:30:00Z",
    enriched: true,
  },
  {
    id: 2,
    code: `class UserService:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def create_user(self, user_data):
        return self.db.users.insert(user_data)`,
    language: "Python",
    tags: ["class", "database", "user-management"],
    project: "API Backend",
    timestamp: "2024-01-15T09:15:00Z",
    enriched: false,
  },
  {
    id: 3,
    code: `SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name;`,
    language: "SQL",
    tags: ["query", "join", "aggregation"],
    project: "Analytics Dashboard",
    timestamp: "2024-01-15T08:45:00Z",
    enriched: true,
  },
]

const languageColors: Record<string, string> = {
  JavaScript: "#F7DF1E",
  Python: "#3776AB",
  SQL: "#336791",
  TypeScript: "#3178C6",
  React: "#61DAFB",
  Node: "#339933",
}

interface IntegrationStatus {
  notion: boolean;
  github: boolean;
  telegram: boolean;
  pieces: boolean;
}

export default function DevDiaryDashboard() {
  // Theme handling
  const { theme, setTheme } = useTheme()
  const [darkMode, setDarkMode] = useState(false)
  
  // Other state
  const [selectedSnippet, setSelectedSnippet] = useState<any>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  const [previewMode, setPreviewMode] = useState(false)
  const [filterLanguage, setFilterLanguage] = useState("all")
  const [filterProject, setFilterProject] = useState("all")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSavingGist, setIsSavingGist] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(format(new Date(), "MMMM dd, yyyy"))
  
  // Recent activity tracking
  const [recentlyUsedSnippets, setRecentlyUsedSnippets] = useState<Array<any>>([])

  // Integration state
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    notion: config.notion.enabled,
    github: config.github.enabled,
    telegram: config.telegram.enabled,
    pieces: config.pieces.enabled,
  })
  
  // Diary state
  const [diaryTitle, setDiaryTitle] = useState(`Dev Diary - ${format(new Date(), "MMMM dd, yyyy")}`)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const [publishResults, setPublishResults] = useState<{
    notion?: { url: string };
    github?: { url: string; id: string };
    telegram?: boolean;
  }>({})

  // Sync theme state with next-themes
  useEffect(() => {
    setDarkMode(theme === "dark")
  }, [theme])

  // Handle theme toggle
  const handleThemeToggle = (checked: boolean) => {
    setDarkMode(checked)
    setTheme(checked ? "dark" : "light")
  }

  // Snippets state
  const filteredSnippets = mockSnippets.filter((snippet) => {
    const languageMatch = filterLanguage === "all" || snippet.language === filterLanguage
    const projectMatch = filterProject === "all" || snippet.project === filterProject
    return languageMatch && projectMatch
  })

  // Initialize with default content
  useEffect(() => {
    const initializeDiary = async () => {
      setCurrentDate(format(new Date(), "MMMM dd, yyyy"))
      setDiaryTitle(`Dev Diary - ${format(new Date(), "MMMM dd, yyyy")}`)
      
      // If auto-generate is enabled, generate diary on load
      if (config.app.autoGenerateDaily) {
        handleGenerateDiary()
      } else {
        // Load default template
        setMarkdownContent(`# Dev Diary - ${format(new Date(), "MMMM dd, yyyy")}

## Summary
_Today I worked on..._

## Code Highlights

_Add your key code snippets here..._

## Decisions Made

_Document important decisions and their rationale..._

## Challenges & Solutions

_What challenges did you face and how did you solve them?_

## Next Steps

_What's planned for tomorrow?_
`)
      }
    }

    initializeDiary()
  }, [])

  // Handler functions
  const handleGenerateDiary = async () => {
    try {
      setIsGenerating(true)

      // In a real implementation, we'd use the DiaryCoordinator service
      // For now, just simulate the generation with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update with "generated" content - in a real implementation this would come from the service
      const generatedContent = `# Dev Diary - ${format(new Date(), "MMMM dd, yyyy")}

## Daily Summary
Today I focused on developing the e-commerce checkout flow and optimizing database queries for our analytics dashboard. Made significant progress with implementing the payment processing integration and refactoring the user authentication system.

## Code Highlights

### JavaScript - E-commerce App
\`\`\`javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}
\`\`\`

### Python - API Backend
\`\`\`python
class UserService:
    def __init__(self, db_connection):
        self.db = db_connection
    
    def create_user(self, user_data):
        return self.db.users.insert(user_data)
\`\`\`

### SQL - Analytics Dashboard
\`\`\`sql
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name;
\`\`\`

## Key Decisions
- Switched from custom payment processing to Stripe API for better security and compliance
- Implemented database indexing on frequently queried columns to improve performance
- Decided to use React Query for state management to reduce boilerplate code

## Challenges & Solutions
- **Challenge**: The checkout process was timing out for users with large carts.
  - **Solution**: Implemented batch processing and optimized database queries.
- **Challenge**: Authentication tokens were expiring too quickly.
  - **Solution**: Extended token lifetime and added refresh token mechanism.

## Projects Worked On
- E-commerce App: Checkout flow optimization
- API Backend: User authentication improvements
- Analytics Dashboard: Query performance tuning

## Tags
#javascript #python #sql #ecommerce #authentication #performance

## Next Steps
- Implement error handling for user creation flow
- Add unit tests for calculation functions
- Optimize SQL queries with proper indexing
- Schedule review meeting for the new checkout process`

      setMarkdownContent(generatedContent)
      setLastGenerated(new Date().toISOString())

      toast({
        title: "Diary Generated",
        description: "Today's dev diary has been successfully generated!",
      })
    } catch (error) {
      console.error("Error generating diary:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate diary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePublishDiary = async () => {
    try {
      setIsPublishing(true)
      
      // Simulate publishing with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock publish results
      const results = {
        notion: config.notion.enabled ? { url: "https://notion.so/example-diary" } : undefined,
        github: config.github.enabled ? { url: "https://gist.github.com/user/123456", id: "123456" } : undefined,
        telegram: config.telegram.enabled,
      }
      
      setPublishResults(results)
      
      const successMessages = []
      if (results.notion) successMessages.push("Published to Notion")
      if (results.github) successMessages.push("Saved to GitHub Gist")
      if (results.telegram) successMessages.push("Sent to Telegram")
      
      toast({
        title: "Diary Published",
        description: successMessages.join(", "),
      })
    } catch (error) {
      console.error("Error publishing diary:", error)
      toast({
        title: "Publishing Failed",
        description: "Failed to publish diary to one or more destinations.",
        variant: "destructive",
      })
    } finally {
      setIsPublishing(false)
    }
  }

  const handleExport = (format: string) => {
    toast({
      title: `Exported as ${format.toUpperCase()}`,
      description: `Your dev diary has been exported as ${format} file.`,
    })
  }

  const handleEnrichSnippet = (snippetId: number) => {
    toast({
      title: "Snippet Enriched",
      description: "AI has added context and documentation to your snippet.",
    })
  }

  const handleSaveAsGist = async () => {
    if (!integrationStatus.github || !config.github.token) {
      toast({
        title: "GitHub Not Connected",
        description: "Please configure your GitHub integration in settings first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingGist(true);

      // Create a new DiaryCoordinator with just GitHub config
      const githubService = new DiaryCoordinator({
        geminiApiKey: config.gemini.apiKey || 'dummy-key',
        githubConfig: {
          githubToken: config.github.token
        }
      }).githubService;

      if (!githubService) {
        throw new Error("Failed to initialize GitHub service");
      }

      // Create a Gist with the diary content
      const result = await githubService.createGist(
        diaryTitle, // Use the diary title as Gist description
        markdownContent, // Use the current markdown content
        false // Create as private Gist
      );

      // Update publish results to include GitHub info
      setPublishResults(prevResults => ({
        ...prevResults,
        github: {
          url: result.url,
          id: result.id,
        }
      }));

      // Automatically open the Gist in a new tab
      window.open(result.url, '_blank');

      toast({
        title: "Saved as Gist",
        description: (
          <div>
            Your diary has been saved as a GitHub Gist.
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">
              View on GitHub
            </a>
          </div>
        )
      });
    } catch (error) {
      console.error("Error saving as Gist:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save diary as Gist. Please check your GitHub token and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGist(false);
    }
  }

  // Handle copying a snippet and add to recent activity
  const handleCopySnippet = (snippet: any) => {
    // Copy the code to clipboard
    navigator.clipboard.writeText(snippet.code);
    
    // Add to recently used snippets (avoid duplicates by id)
    setRecentlyUsedSnippets(prev => {
      // Remove the snippet if it already exists in the list
      const filtered = prev.filter(s => s.id !== snippet.id);
      
      // Add the snippet to the beginning of the array with updated timestamp
      return [
        {
          ...snippet,
          timestamp: new Date().toISOString() // Update timestamp to now
        },
        ...filtered
      ].slice(0, 5); // Keep only the 5 most recent snippets
    });
    
    toast({
      title: "Code Copied",
      description: "Code snippet has been copied to clipboard and added to your recent activity.",
    });
  };

  // Clipboard monitoring effect
  useEffect(() => {
    const clipboardService = new ClipboardService({
      onSnippetCopied: (snippet: ClipboardSnippet) => {
        // Automatically add copied snippet to recently used snippets
        setRecentlyUsedSnippets(prev => {
          // Remove the snippet if it already exists in the list
          const filtered = prev.filter(s => s.id !== snippet.id);
          
          // Add the snippet to the beginning of the array
          return [
            {
              ...snippet,
              timestamp: new Date().toISOString() // Update timestamp to now
            },
            ...filtered
          ].slice(0, 5); // Keep only the 5 most recent snippets
        });

        toast({
          title: "Snippet Copied",
          description: "A new snippet has been copied to your clipboard.",
        });
      }
    });

    clipboardService.start();

    return () => {
      clipboardService.stop();
    };
  }, []);

  // External clipboard monitoring effect
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined') return;
    
    const clipboardService = ClipboardService.getInstance();
    
    // Add listener for captured code snippets
    const handleExternalSnippet = (snippet: ClipboardSnippet) => {
      setRecentlyUsedSnippets(prev => {
        // Always create a new array with the new snippet at the beginning
        const newSnippets = [
          {
            ...snippet,
            timestamp: new Date().toISOString() // Ensure fresh timestamp
          },
          ...prev
        ].slice(0, 10); // Keep only the 10 most recent snippets
        
        toast({
          title: `${snippet.language} Code Detected`,
          description: "External code snippet has been added to your Recent Activity.",
        });
        
        return newSnippets;
      });
    };
    
    clipboardService.addListener(handleExternalSnippet);
    clipboardService.start();
    
    // Cleanup function
    return () => {
      clipboardService.removeListener(handleExternalSnippet);
      clipboardService.stop();
    };
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="bg-background text-foreground">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Code2 className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">Dev Diary</span>
              </div>
              <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                  Dashboard
                </a>
                <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                  Snippets
                </a>
                <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                  Summarizer
                </a>
                <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                  Settings
                </a>
                <a href="#" className="text-foreground/60 hover:text-foreground transition-colors">
                  Help
                </a>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch checked={darkMode} onCheckedChange={handleThemeToggle} />
                <Moon className="h-4 w-4" />
              </div>

              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>

              {/* Mobile menu button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80%] sm:w-[385px]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between py-4 border-b">
                      <div className="flex items-center gap-2">
                        <Code2 className="h-5 w-5 text-primary" />
                        <span className="font-bold">Dev Diary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <Switch checked={darkMode} onCheckedChange={handleThemeToggle} />
                        <Moon className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="py-4 flex flex-col space-y-3">
                      <div className="flex items-center gap-2 p-3 hover:bg-accent rounded-md">
                        <Code2 className="h-4 w-4" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 hover:bg-accent rounded-md">
                        <FolderOpen className="h-4 w-4" />
                        <span>Snippets</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 hover:bg-accent rounded-md">
                        <BookText className="h-4 w-4" />
                        <span>Summarizer</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 hover:bg-accent rounded-md" onClick={() => setSettingsOpen(true)}>
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </div>
                    </div>

                    <div className="mt-auto border-t py-4">
                      <div className="flex items-center p-2 gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src="https://avatars.githubusercontent.com/u/170235967?v=4" alt="User" />
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">Bikram Doe</p>
                          <p className="text-xs text-muted-foreground">bikram@example.com</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="https://avatars.githubusercontent.com/u/170235967?v=4" alt="User" />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Bikram Doe</p>
                      <p className="text-xs leading-none text-muted-foreground">bikram@example.com</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="container mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="language-filter">Language</Label>
                    <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Languages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        <SelectItem value="JavaScript">JavaScript</SelectItem>
                        <SelectItem value="Python">Python</SelectItem>
                        <SelectItem value="SQL">SQL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="project-filter">Project</Label>
                    <Select value={filterProject} onValueChange={setFilterProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        <SelectItem value="E-commerce App">E-commerce App</SelectItem>
                        <SelectItem value="API Backend">API Backend</SelectItem>
                        <SelectItem value="Analytics Dashboard">Analytics Dashboard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Integration Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Integration Status
                  </CardTitle>
                  <CardDescription>Connected services for your Dev Diary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span className="text-sm">Notion</span>
                    </div>
                    <Badge variant="secondary" className={integrationStatus.notion ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {integrationStatus.notion ? "✅ Connected" : "❌ Disconnected"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <GithubIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">GitHub Gist</span>
                    </div>
                    <Badge variant="secondary" className={integrationStatus.github ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {integrationStatus.github ? "✅ Connected" : "❌ Disconnected"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span className="text-sm">Telegram</span>
                    </div>
                    <Badge variant="secondary" className={integrationStatus.telegram ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {integrationStatus.telegram ? "✅ Connected" : "❌ Disconnected"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Code2 className="h-4 w-4 mr-2" />
                      <span className="text-sm">Pieces API</span>
                    </div>
                    <Badge variant="secondary" className={integrationStatus.pieces ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {integrationStatus.pieces ? "✅ Connected" : "❌ Disconnected"}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Integrations
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="snippets">Snippets</TabsTrigger>
                  <TabsTrigger value="summarizer">Summarizer</TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold">Welcome back, Bikram!</h1>
                      <p className="text-muted-foreground">Today is {currentDate}</p>
                    </div>
                    <Button 
                      onClick={handleGenerateDiary} 
                      className="bg-primary hover:bg-primary/90"
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Today's Diary
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Status Alert for last generated */}
                  {lastGenerated && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>Diary Generated</AlertTitle>
                      <AlertDescription>
                        Last generated {new Date(lastGenerated).toLocaleTimeString()}. 
                        {publishResults.notion && 
                          <a href={publishResults.notion.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">View in Notion</a>
                        }
                        {publishResults.github && 
                          <a href={publishResults.github.url} target="_blank" rel="noopener noreferrer" className="underline ml-1">View on GitHub</a>
                        }
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Snippets Today</CardTitle>
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">🧩 {mockSnippets.length}</div>
                        <p className="text-xs text-muted-foreground">+2 from yesterday</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tags Applied</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">🏷️ 9</div>
                        <p className="text-xs text-muted-foreground">Across all snippets</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projects</CardTitle>
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">📁 3</div>
                        <p className="text-xs text-muted-foreground">Active projects</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Your latest coding snippets and activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {/* Recently copied snippets appear at the top */}
                          {recentlyUsedSnippets.length > 0 && (
                            <>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary">
                                  Recently Copied
                                </Badge>
                              </div>
                              {recentlyUsedSnippets.map((snippet) => (
                                <div key={`recent-${snippet.id}`} className="flex items-start space-x-4 p-4 border rounded-lg border-primary/20 bg-primary/5">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <Badge
                                        variant="secondary"
                                        style={{
                                          backgroundColor: `${languageColors[snippet.language]}20`,
                                          color: languageColors[snippet.language],
                                        }}
                                      >
                                        {snippet.language}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">{snippet.project}</span>
                                      {snippet.enriched && (
                                        <Badge variant="outline" className="text-xs">
                                          <Sparkles className="mr-1 h-3 w-3" />
                                          Enriched
                                        </Badge>
                                      )}
                                    </div>
                                    <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                                      <code>{snippet.code.split("\n").slice(0, 3).join("\n")}...</code>
                                    </pre>
                                    <div className="flex flex-wrap gap-1">
                                      {snippet.tags.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Copied {new Date(snippet.timestamp).toLocaleTimeString()}
                                    </p>
                                  </div>
                                  <div className="flex flex-col space-y-1">
                                    <Button variant="ghost" size="sm">
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleCopySnippet(snippet)}>
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEnrichSnippet(snippet.id)}>
                                      <Sparkles className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              <Separator className="my-4" />
                            </>
                          )}

                          {/* Original fixed snippets */}
                          <div className="flex items-start space-x-4 p-4 border rounded-lg">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="secondary"
                                  style={{
                                    backgroundColor: `${languageColors["JSON"]}20` || "#89CFF020",
                                    color: languageColors["JSON"] || "#89CFF0",
                                  }}
                                >
                                  JSON
                                </Badge>
                                <span className="text-sm text-muted-foreground">MCP Server Config</span>
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="mr-1 h-3 w-3" />
                                  Enriched
                                </Badge>
                              </div>
                              <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                                <code>{`{
  "mcpServers": {
    "sqlite": {
      "command": "python",
      "args": ["-m", "mcp_server.sqlite_server"],
      "env": {
        "DATABASE_PATH": "database.db"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      }
    }
  }
}`}</code>
                              </pre>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  json
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  configuration
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  mcp
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col space-y-1">
                              <Button variant="ghost" size="sm">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCopySnippet(mockSnippets[0])}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Sparkles className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {filteredSnippets.map((snippet) => (
                            <div key={snippet.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant="secondary"
                                    style={{
                                      backgroundColor: `${languageColors[snippet.language]}20`,
                                      color: languageColors[snippet.language],
                                    }}
                                  >
                                    {snippet.language}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">{snippet.project}</span>
                                  {snippet.enriched && (
                                    <Badge variant="outline" className="text-xs">
                                      <Sparkles className="mr-1 h-3 w-3" />
                                      Enriched
                                    </Badge>
                                  )}
                                </div>
                                <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                                  <code>{snippet.code.split("\n").slice(0, 3).join("\n")}...</code>
                                </pre>
                                <div className="flex flex-wrap gap-1">
                                  {snippet.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col space-y-1">
                                <Button variant="ghost" size="sm">
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleCopySnippet(snippet)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleEnrichSnippet(snippet.id)}>
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Snippets Tab */}
                <TabsContent value="snippets" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Code Snippets</h2>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Snippet
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSnippets.map((snippet) => (
                      <Card key={snippet.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="secondary"
                                style={{
                                  backgroundColor: `${languageColors[snippet.language]}20`,
                                  color: languageColors[snippet.language],
                                }}
                              >
                                {snippet.language}
                              </Badge>
                              {snippet.enriched && (
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="mr-1 h-3 w-3" />
                                  Enriched
                                </Badge>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEnrichSnippet(snippet.id)}>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  Enrich
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <CardDescription>{snippet.project}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm bg-muted p-3 rounded overflow-x-auto mb-3">
                            <code>{snippet.code}</code>
                          </pre>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {snippet.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(snippet.timestamp).toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Summarizer Tab */}
                <TabsContent value="summarizer" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Dev Diary Generator</h2>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                        {previewMode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                        {previewMode ? "Edit" : "Preview"}
                      </Button>
                      <Button variant="outline" onClick={handleGenerateDiary} disabled={isGenerating}>
                        {isGenerating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <Input 
                          value={diaryTitle} 
                          onChange={(e) => setDiaryTitle(e.target.value)}
                          className="text-xl font-bold" 
                        />
                      </CardTitle>
                      <CardDescription>Edit your dev diary content or preview the final result</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {previewMode ? (
                        <ScrollArea className="h-[500px] w-full border rounded-md p-4">
                          <div className="prose prose-sm max-w-none">
                            <pre className="whitespace-pre-wrap">{markdownContent}</pre>
                          </div>
                        </ScrollArea>
                      ) : (
                        <Textarea
                          value={markdownContent}
                          onChange={(e) => setMarkdownContent(e.target.value)}
                          className="min-h-[500px] font-mono text-sm"
                          placeholder="Your dev diary content will appear here..."
                        />
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <div className="flex gap-2">
                        <Button onClick={() => handleExport("md")}>
                          <Download className="mr-2 h-4 w-4" />
                          Export .md
                        </Button>
                        <Button onClick={() => handleExport("pdf")} variant="outline">
                          <Download className="mr-2 h-4 w-4" />
                          Export .pdf
                        </Button>
                      </div>
                      <Button 
                        onClick={handlePublishDiary} 
                        disabled={isPublishing || markdownContent.trim().length === 0}
                        className="bg-primary"
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <SendToBack className="mr-2 h-4 w-4" />
                            Publish to All
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookText className="h-4 w-4" />
                        Code Snippets Summary
                      </CardTitle>
                      <CardDescription>Professional summary of all code snippets in your collection</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <h3>Technical Code Analysis</h3>
                        <p>
                          Your code repository demonstrates proficiency across multiple programming paradigms and technology stacks.
                          The collected snippets showcase architectural patterns, data processing techniques, and system configuration approaches
                          that align with industry best practices.
                        </p>
                        
                        <h3>Architecture & Configuration (JSON)</h3>
                        <p>
                          The Model Context Protocol server configuration implements a modular, service-oriented architecture
                          with clear separation of concerns. Each service (SQLite, filesystem, Brave Search) is independently 
                          configurable with appropriate command interfaces and environment variables. This approach enables 
                          flexible deployment strategies while maintaining configuration consistency across services.
                        </p>
                        
                        <h3>Functional Programming (JavaScript)</h3>
                        <p>
                          The JavaScript calculation function demonstrates effective use of functional programming principles,
                          specifically employing the reduce higher-order function for data transformation. This implementation
                          showcases immutable data handling and declarative programming style, resulting in concise, 
                          maintainable code with predictable behavior in e-commerce calculation contexts.
                        </p>
                        
                        <h3>Object-Oriented Design (Python)</h3>
                        <p>
                          The Python UserService class exemplifies SOLID principles with clear single responsibility
                          and dependency injection patterns. The service abstraction properly encapsulates database operations
                          while providing a clean API surface. This design facilitates unit testing through mock injection
                          and promotes loose coupling between system components.
                        </p>
                        
                        <h3>Data Analysis & Performance (SQL)</h3>
                        <p>
                          The SQL query demonstrates advanced analytical capabilities through effective table joins,
                          conditional filtering, and data aggregation. The query structure follows performance optimization
                          best practices with selective column projection and proper indexing considerations. The GROUP BY
                          implementation enables meaningful business intelligence extraction for user behavior analysis.
                        </p>

                        <h3>Technical Competencies</h3>
                        <p>
                          This collection comprehensively demonstrates:
                        </p>
                        <ul>
                          <li>Distributed systems configuration with environment isolation</li>
                          <li>Functional programming with higher-order functions</li>
                          <li>Object-oriented design with proper encapsulation and dependency management</li>
                          <li>Data modeling and analytical query optimization</li>
                          <li>Cross-platform development expertise spanning front-end, back-end, and data layers</li>
                          <li>Modern development practices including configuration as code and API-first design</li>
                        </ul>
                        
                        <h3>Development Trends</h3>
                        <p>
                          Your recent coding activity shows increased focus on API development and data processing workflows,
                          with particular emphasis on service configuration and performance optimization. Consider exploring
                          additional error handling patterns and automated testing approaches to further enhance code quality.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline">
                      <BookText className="mr-2 h-4 w-4" />
                      Publish to Notion
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleSaveAsGist}
                      disabled={!integrationStatus.github || isSavingGist || markdownContent.trim().length === 0}
                    >
                      {isSavingGist ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Github className="mr-2 h-4 w-4" />
                      )}
                      Save as Gist
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Dev Diary Settings</DialogTitle>
              <DialogDescription>
                Configure your integrations and preferences for automatic diary generation
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Gemini API</h3>
                <div className="flex items-center space-x-2">
                  <Input 
                    type="password" 
                    placeholder="Gemini API Key" 
                    value={config.gemini.apiKey ? "••••••••••••••••••••" : ""}
                  />
                  <Button size="sm" variant="outline">Update</Button>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Notion Integration</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    placeholder="Notion API Key"
                    value={config.notion.apiKey ? "••••••••••••••••••••" : ""} 
                  />
                  <Input 
                    placeholder="Database ID"
                    value={config.notion.databaseId ? "••••••••••••••••••••" : ""}
                  />
                </div>
                <Button size="sm" className="mt-2" variant="outline">Connect Notion</Button>
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium">GitHub Gist Integration</h3>
                <div className="flex items-center space-x-2">
                  <Input 
                    placeholder="GitHub Personal Access Token" 
                    value={config.github.token ? "••••••••••••••••••••" : ""}
                  />
                  <Button size="sm" variant="outline">Connect</Button>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Telegram Notifications</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    placeholder="Bot Token" 
                    value={config.telegram.token ? "••••••••••••••••••••" : ""}
                  />
                  <Input 
                    placeholder="Chat ID"
                    value={config.telegram.chatId || ""}
                  />
                </div>
                <Button size="sm" className="mt-2" variant="outline">Setup Telegram</Button>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Automation Settings</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-generate" checked={config.app.autoGenerateDaily} />
                  <Label htmlFor="auto-generate">Auto-generate diary daily</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="auto-publish" checked={config.app.autoPublish} />
                  <Label htmlFor="auto-publish">Auto-publish after generation</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="activity-logging" checked={config.app.enableActivityLogging} />
                  <Label htmlFor="activity-logging">Enable activity logging</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mobile Navigation Drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg">
              <Plus className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent className="p-4">
            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleGenerateDiary} 
                className="bg-primary hover:bg-primary/90"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Today's Diary
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                {previewMode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                {previewMode ? "Edit" : "Preview"}
              </Button>

              <Button 
                onClick={handlePublishDiary} 
                disabled={isPublishing || markdownContent.trim().length === 0}
                className="bg-primary"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <SendToBack className="mr-2 h-4 w-4" />
                    Publish to All
                  </>
                )}
              </Button>

              <Button 
                variant="outline" 
                onClick={handleSaveAsGist}
                disabled={!integrationStatus.github || isSavingGist || markdownContent.trim().length === 0}
              >
                {isSavingGist ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Github className="mr-2 h-4 w-4" />
                )}
                Save as Gist
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
