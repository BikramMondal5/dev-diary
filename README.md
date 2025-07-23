# Dev Diary 📝

A comprehensive tool for developers to document their coding activities, generate insightful summaries, and publish development journals across multiple platforms. Dev Diary helps you track your progress, remember decisions, and create shareable documentation of your development journey.

## 🌟 Features

- **Intelligent Diary Generation**: Automatically create structured diary entries from your daily coding activities using Gemini 2.0 Flash AI
- **Code Snippet Management**: Save, categorize, and analyze your code snippets with language detection and tagging
- **Multi-platform Publishing**: Share your diary entries to Notion, GitHub Gists, and Telegram
- **Git Activity Tracking**: Capture commits, branch changes, and pull requests
- **Interactive Dashboard**: View activity metrics and coding patterns
- **Customizable Automation**: Configure automatic diary generation and publishing
- **Markdown Export**: Export your diary entries as beautifully formatted Markdown

## 🛠️ Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **AI Integration**: Google's Gemini 2.0 Flash
- **External Services**:
  - Notion API for knowledge base integration
  - GitHub API for Gist creation and management
  - Telegram API for notifications
  - Pieces API for code snippet management
- **Styling**: shadcn/ui components, Tailwind CSS
- **Authentication**: Environment-based API key management

## 🚀 How to Use

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm or pnpm
- API keys for the services you want to use:
  - Google Generative AI (Gemini)
  - Notion (optional)
  - GitHub (optional)
  - Telegram (optional)
  - Pieces (optional)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/BikramMondal5/dev-diary
   cd dev-diary
   ```

2. **Install dependencies**:
   ```bash
   npm install --legacy-peer-deps
   # OR if you use pnpm
   pnpm install --legacy-peer-deps
   ```

3. **Environment configuration**:
   Create a `.env` file in the root directory with the following variables:
   ```
   # Gemini API Configuration
   NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key-here

   # Notion Integration (Optional)
   NEXT_PUBLIC_NOTION_API_KEY=your-notion-api-key-here
   NEXT_PUBLIC_NOTION_DATABASE_ID=your-notion-database-id-here

   # GitHub Integration (Optional)
   NEXT_PUBLIC_GITHUB_TOKEN=your-github-personal-access-token-here

   # Telegram Integration (Optional)
   NEXT_PUBLIC_TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
   NEXT_PUBLIC_TELEGRAM_CHAT_ID=your-telegram-chat-id-here

   # Pieces API Configuration (Optional)
   NEXT_PUBLIC_PIECES_BASE_URL=http://localhost:1000
   NEXT_PUBLIC_PIECES_API_KEY=your-pieces-api-key-here-if-required

   # Git Repository Settings (Optional)
   NEXT_PUBLIC_GIT_REPOSITORY_PATH=path-to-your-repository

   # App Configuration
   NEXT_PUBLIC_AUTO_GENERATE_DAILY=false
   NEXT_PUBLIC_AUTO_PUBLISH=false
   NEXT_PUBLIC_ENABLE_ACTIVITY_LOGGING=true
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   # OR if you use pnpm
   pnpm dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   # OR if you use pnpm
   pnpm build
   pnpm start
   ```

### Detailed Usage Guide

#### Setting Up Integrations

##### 1. Gemini AI Setup (Required)
- Sign up for a Google AI Studio account
- Create a new API key
- Add the key to your `.env` file as `NEXT_PUBLIC_GEMINI_API_KEY`

##### 2. Notion Integration (Optional)
- Go to [Notion Integrations](https://www.notion.so/my-integrations)
- Create a new "Internal Integration"
- Copy the secret token as your `NEXT_PUBLIC_NOTION_API_KEY`
- Create a database in Notion
- Add the integration to your database via "Add connections" in the database menu
- Copy the database ID from the URL (the part after your workspace name and before any query parameters)
- Add it to your `.env` file as `NEXT_PUBLIC_NOTION_DATABASE_ID`

##### 3. GitHub Integration (Optional)
- Go to GitHub [Personal Access Tokens](https://github.com/settings/tokens)
- Generate a new token with the `gist` scope
- Add the token to your `.env` file as `NEXT_PUBLIC_GITHUB_TOKEN`

##### 4. Telegram Integration (Optional)
- Create a new bot using [BotFather](https://t.me/botfather)
- Get the bot token and add it as `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN`
- Find your chat ID by messaging [@userinfobot](https://t.me/userinfobot)
- Add your chat ID as `NEXT_PUBLIC_TELEGRAM_CHAT_ID`

#### Core Functionality

##### Dashboard
- The main dashboard shows your recent activity metrics
- View coding language distribution
- Track your most active projects
- See recent code snippets

##### Recording Code Snippets
1. Navigate to the "Snippets" section
2. Click "Add New Snippet"
3. Enter your code, select language, and add tags
4. Add a project name for better organization
5. Save the snippet

##### Generating a Dev Diary
1. Navigate to the "Summarizer" section
2. Click "Generate Today's Diary"
3. The AI will process your:
   - Saved code snippets
   - Git activity (if configured)
   - Notes and decisions
4. Review the generated diary
5. Edit if needed before publishing

##### Publishing Your Diary
1. After generating a diary, click "Publish"
2. Select the platforms where you want to publish:
   - Notion: Creates a new page in your configured database
   - GitHub: Creates a new Gist
   - Telegram: Sends a message with diary highlights

##### Customization Options
- **AI Prompting**: Customize the prompts for diary generation in settings
- **Auto-generation**: Enable daily diary generation at a specific time
- **Auto-publishing**: Automatically publish to your selected platforms
- **Theming**: Toggle between light and dark modes

### Tips for Best Results

1. **Consistent Snippet Saving**: Add code snippets throughout your day for better diary quality
2. **Tag Your Snippets**: Use consistent tagging for better organization
3. **Add Project Names**: Group snippets by projects for better reporting
4. **Regular Diary Generation**: Generate diaries daily for continuous documentation
5. **Review Before Publishing**: Always review AI-generated content before sharing

## 🤝 Contribution

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the `MIT License`.
