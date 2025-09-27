# Better Chatbot - Complete Codebase Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Directory Structure](#directory-structure)
4. [Database Schema](#database-schema)
5. [Authentication System](#authentication-system)
6. [MCP Integration (Core Feature)](#mcp-integration-core-feature)
7. [AI/LLM Integrations](#aillm-integrations)
8. [Pages & Routes](#pages--routes)
9. [Components Architecture](#components-architecture)
10. [Agent System](#agent-system)
11. [Workflow System](#workflow-system)
12. [Default Tools](#default-tools)
13. [Configuration System](#configuration-system)
14. [API Reference](#api-reference)
15. [Deployment Options](#deployment-options)
16. [Development Workflow](#development-workflow)

---

## Project Overview

**Better Chatbot** is a sophisticated, open-source AI chatbot platform that integrates multiple LLM providers with powerful tooling capabilities through the Model Context Protocol (MCP). It's designed for both individual users and teams, offering features like custom agents, visual workflows, voice chat, and extensive tool integration.

### Key Features
- **Multi-AI Support**: OpenAI, Anthropic, Google, xAI, Ollama, OpenRouter, and more
- **MCP Protocol**: First-class support for Model Context Protocol tool integration
- **Custom Agents**: Create specialized AI assistants with custom instructions and tools
- **Visual Workflows**: Build complex multi-step processes as reusable tools
- **Voice Assistant**: Real-time voice chat with full tool integration
- **Team Collaboration**: Share agents, workflows, and MCP configurations
- **Powerful Tools**: Web search, code execution, data visualization, browser automation

---

## Architecture & Tech Stack

### Core Technologies
- **Framework**: Next.js 15.3.2 with App Router
- **Language**: TypeScript 5.9.2
- **Database**: PostgreSQL with Drizzle ORM 0.41.0
- **Authentication**: Better Auth 1.3.13
- **AI SDK**: Vercel AI SDK 5.0.48
- **UI**: Radix UI primitives + Tailwind CSS 4.1.13
- **Package Manager**: pnpm 10.2.1

### Key Dependencies
```json
{
  "ai": "^5.0.48",
  "@ai-sdk/anthropic": "^2.0.17",
  "@ai-sdk/openai": "^2.0.32",
  "@modelcontextprotocol/sdk": "^1.18.1",
  "better-auth": "^1.3.13",
  "drizzle-orm": "^0.41.0",
  "@xyflow/react": "^12.8.5",
  "framer-motion": "^12.23.16"
}
```

---

## Directory Structure

```
src/
├── app/                           # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (chat)/                   # Main application pages
│   │   ├── agents/               # Agent management
│   │   ├── agent/[id]/          # Individual agent config
│   │   ├── archive/[id]/        # Archived conversations
│   │   ├── chat/[thread]/       # Chat threads
│   │   ├── mcp/                 # MCP server management
│   │   ├── workflow/            # Workflow management
│   │   └── page.tsx             # Main chat interface
│   ├── api/                     # API routes
│   │   ├── auth/[...all]/       # Better Auth handler
│   │   ├── chat/                # Chat API endpoints
│   │   ├── agent/               # Agent CRUD
│   │   ├── mcp/                 # MCP management
│   │   └── user/                # User preferences
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── store/                   # Client state management
├── components/                   # React components
│   ├── agent/                   # Agent-related UI
│   ├── layouts/                 # Layout components
│   ├── tool-invocation/         # Tool execution UI
│   ├── ui/                      # Base UI components
│   └── workflow/                # Workflow editor
├── hooks/                       # Custom React hooks
├── lib/                         # Core business logic
│   ├── ai/                      # AI integrations
│   │   ├── mcp/                 # MCP client system
│   │   ├── providers/           # LLM providers
│   │   └── tools/               # Built-in tools
│   ├── auth/                    # Authentication config
│   ├── cache/                   # Caching utilities
│   ├── code-runner/             # Sandboxed code execution
│   ├── db/                      # Database layer
│   │   ├── pg/                  # PostgreSQL specific
│   │   └── repositories/        # Data access layer
│   └── utils/                   # Utility functions
├── types/                       # TypeScript definitions
└── i18n/                        # Internationalization
```

---

## Database Schema

### Core Tables

#### Users & Authentication
```sql
-- User accounts
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    emailVerified TIMESTAMP,
    image TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preferences JSON -- UserPreferences type
);

-- Authentication sessions
CREATE TABLE "session" (
    id TEXT PRIMARY KEY,
    expiresAt TIMESTAMP NOT NULL,
    token TEXT UNIQUE NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ipAddress TEXT,
    userAgent TEXT,
    userId UUID REFERENCES "user"(id),
    impersonatedBy UUID
);

-- OAuth accounts
CREATE TABLE "account" (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId UUID REFERENCES "user"(id),
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TIMESTAMP,
    refreshTokenExpiresAt TIMESTAMP,
    scope TEXT,
    password TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Chat System
```sql
-- Chat conversations
CREATE TABLE "chat_thread" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    userId UUID REFERENCES "user"(id) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual messages
CREATE TABLE "chat_message" (
    id TEXT PRIMARY KEY,
    threadId UUID REFERENCES "chat_thread"(id) NOT NULL,
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system' | 'tool'
    parts JSON[] NOT NULL, -- UIMessage parts
    metadata JSON, -- ChatMetadata type
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### MCP System
```sql
-- MCP server configurations
CREATE TABLE "mcp_server" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    config JSON NOT NULL, -- MCPServerConfig type
    userId UUID REFERENCES "user"(id) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-user MCP server customizations
CREATE TABLE "mcp_server_custom_instructions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcpServerId UUID REFERENCES "mcp_server"(id) NOT NULL,
    userId UUID REFERENCES "user"(id) NOT NULL,
    instructions TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mcpServerId, userId)
);

-- Per-user tool customizations
CREATE TABLE "mcp_server_tool_custom_instructions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcpServerId UUID REFERENCES "mcp_server"(id) NOT NULL,
    toolName TEXT NOT NULL,
    userId UUID REFERENCES "user"(id) NOT NULL,
    instructions TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mcpServerId, toolName, userId)
);

-- MCP OAuth sessions
CREATE TABLE "mcp_oauth_session" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcpServerId UUID REFERENCES "mcp_server"(id) NOT NULL,
    userId UUID REFERENCES "user"(id) NOT NULL,
    state TEXT UNIQUE NOT NULL,
    codeVerifier TEXT NOT NULL,
    redirectUri TEXT NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Agent System
```sql
-- Custom AI agents
CREATE TABLE "agent" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon JSON, -- AgentIcon type
    userId UUID REFERENCES "user"(id) NOT NULL,
    instructions JSON, -- Agent instructions
    visibility VARCHAR(10) CHECK (visibility IN ('public', 'private', 'readonly')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User bookmarks for agents
CREATE TABLE "bookmark" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userId UUID REFERENCES "user"(id) NOT NULL,
    agentId UUID REFERENCES "agent"(id),
    workflowId UUID REFERENCES "workflow"(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, agentId),
    UNIQUE(userId, workflowId)
);
```

#### Workflow System
```sql
-- Visual workflows
CREATE TABLE "workflow" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    userId UUID REFERENCES "user"(id) NOT NULL,
    published BOOLEAN DEFAULT false,
    visibility VARCHAR(10) CHECK (visibility IN ('public', 'private', 'readonly')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow nodes
CREATE TABLE "workflow_node" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflowId UUID REFERENCES "workflow"(id) NOT NULL,
    node JSON NOT NULL, -- DBNode type
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow edges (connections)
CREATE TABLE "workflow_edge" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflowId UUID REFERENCES "workflow"(id) NOT NULL,
    edge JSON NOT NULL, -- DBEdge type
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Archive System
```sql
-- Conversation archives
CREATE TABLE "archive" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    userId UUID REFERENCES "user"(id) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Archive items (messages/conversations)
CREATE TABLE "archive_item" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    archiveId UUID REFERENCES "archive"(id) NOT NULL,
    data JSON NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Authentication System

### Better Auth Configuration
Located in `src/lib/auth/auth.ts`:

```typescript
export const auth = betterAuth({
  database: drizzleAdapter(pgDb, {
    provider: "pg",
    schema: {
      user: UserSchema,
      session: SessionSchema,
      account: AccountSchema,
      verification: VerificationSchema,
    }
  }),
  emailAndPassword: {
    enabled: !process.env.DISABLE_EMAIL_SIGN_IN,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: ["email", "profile"],
      forceAccountSelection: process.env.GOOGLE_FORCE_ACCOUNT_SELECTION === "1",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["user:email"],
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID,
      forceAccountSelection: process.env.MICROSOFT_FORCE_ACCOUNT_SELECTION === "1",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    generateId: () => nanoid(),
  },
});
```

### Protected Routes
Authentication middleware protects routes using the `(chat)` route group.

---

## MCP Integration (Core Feature)

### What is MCP?
Model Context Protocol (MCP) is a standardized protocol that allows AI models to securely access external tools, data sources, and services. Better Chatbot implements comprehensive MCP support through `@modelcontextprotocol/sdk`.

### MCP Client Architecture

#### Core MCP Client (`src/lib/ai/mcp/client.ts`)
```typescript
export class MCPClient {
  private client: Client;
  private transport: Transport;
  
  constructor(config: MCPServerConfig) {
    this.transport = this.createTransport(config);
    this.client = new Client({
      name: "better-chatbot",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    });
  }

  async connect(): Promise<void> {
    await this.client.connect(this.transport);
  }

  async listTools(): Promise<Tool[]> {
    const response = await this.client.request(
      { method: "tools/list" },
      ListToolsRequestSchema
    );
    return response.tools;
  }

  async callTool(name: string, arguments_: any): Promise<CallToolResult> {
    const response = await this.client.request(
      {
        method: "tools/call",
        params: { name, arguments: arguments_ },
      },
      CallToolRequestSchema
    );
    return response;
  }
}
```

#### Transport Types
1. **Stdio Transport**: For local MCP servers
2. **HTTP Transport**: For remote MCP servers
3. **StreamableHTTP**: For streaming responses

#### MCP Server Configuration Types
```typescript
type MCPServerConfig = {
  name: string;
  type: "stdio" | "http";
  // Stdio configuration
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // HTTP configuration
  url?: string;
  headers?: Record<string, string>;
  // OAuth configuration
  oauth?: {
    authUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes?: string[];
    redirectUri?: string;
  };
};
```

### MCP OAuth Flow
Sophisticated OAuth2 implementation for authenticated MCP servers:

```typescript
// OAuth session management
export class MCPOAuthManager {
  async initiateOAuth(serverId: string, userId: string): Promise<string> {
    const state = nanoid();
    const codeVerifier = generateCodeVerifier();
    
    await db.insert(MCPOAuthSessionSchema).values({
      mcpServerId: serverId,
      userId,
      state,
      codeVerifier,
      redirectUri: `${process.env.BETTER_AUTH_URL}/api/mcp/oauth/callback`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    return this.buildAuthUrl(state, codeVerifier);
  }

  async handleCallback(code: string, state: string): Promise<void> {
    // Exchange code for tokens and store securely
  }
}
```

### Tool Integration with Vercel AI SDK
MCP tools are converted to Vercel AI SDK format:

```typescript
type VercelAIMcpTool = Tool & {
  _mcpServerName: string;
  _mcpServerId: string;
  _originToolName: string;
};

export async function mcpToolToVercelTool(
  mcpTool: Tool,
  mcpClient: MCPClient,
  serverId: string,
  serverName: string
): Promise<VercelAIMcpTool> {
  return {
    type: "function",
    function: {
      name: `${serverName}__${mcpTool.name}`,
      description: mcpTool.description,
      parameters: mcpTool.inputSchema,
    },
    _mcpServerName: serverName,
    _mcpServerId: serverId,
    _originToolName: mcpTool.name,
  };
}
```

---

## AI/LLM Integrations

### Supported Providers
```typescript
// Provider configurations in src/lib/ai/providers/
const providers = {
  openai: openai({
    apiKey: process.env.OPENAI_API_KEY,
  }),
  anthropic: anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  google: google({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  }),
  xai: xai({
    apiKey: process.env.XAI_API_KEY,
  }),
  groq: groq({
    apiKey: process.env.GROQ_API_KEY,
  }),
  ollama: ollama({
    baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
  }),
};
```

### Chat API Implementation
Main chat endpoint at `src/app/api/chat/route.ts`:

```typescript
export async function POST(request: Request) {
  const { messages, model, tools, toolChoice } = await request.json();
  
  // Get provider and model
  const [providerName, modelName] = model.split("/");
  const provider = providers[providerName];
  
  // Convert MCP tools to Vercel AI format
  const vercelTools = await convertMcpToolsToVercelFormat(tools);
  
  // Stream response
  const result = streamText({
    model: provider(modelName),
    messages,
    tools: vercelTools,
    toolChoice,
    onToolCall: async ({ toolCallId, toolName, args }) => {
      // Handle MCP tool execution
      return await executeMcpTool(toolName, args);
    },
  });

  return result.toDataStreamResponse();
}
```

### Model Management
Dynamic model discovery and management:

```typescript
export async function getAvailableModels(): Promise<ModelConfig[]> {
  const models: ModelConfig[] = [];
  
  // Add OpenAI models
  if (process.env.OPENAI_API_KEY) {
    models.push(...OPENAI_MODELS);
  }
  
  // Add Anthropic models
  if (process.env.ANTHROPIC_API_KEY) {
    models.push(...ANTHROPIC_MODELS);
  }
  
  // Add local Ollama models
  if (process.env.OLLAMA_BASE_URL) {
    const ollamaModels = await fetchOllamaModels();
    models.push(...ollamaModels);
  }
  
  return models;
}
```

---

## Pages & Routes

### Authentication Routes (`(auth)` group)
- **`/sign-in`** - Login page with email/password and OAuth options
- **`/sign-up`** - Registration page (can be disabled via `DISABLE_SIGN_UP`)

### Main Application Routes (`(chat)` group)

#### Core Chat Interface
- **`/`** - Main chat interface with sidebar, tool selection, and message history
- **`/chat/[thread]`** - Individual chat thread view with full conversation history

#### Agent Management
- **`/agents`** - Browse and manage custom agents
  - Public/private agent listings
  - Agent search and filtering
  - Bookmark functionality
- **`/agent/[id]`** - Individual agent configuration
  - Edit agent instructions and system prompts
  - Tool access configuration
  - Sharing settings

#### MCP Server Management
- **`/mcp`** - MCP server dashboard
  - List all configured MCP servers
  - Server status and connection health
  - Quick access to server tools
- **`/mcp/create`** - Add new MCP server
  - Stdio server configuration
  - HTTP server setup
  - OAuth flow initiation
- **`/mcp/modify/[id]`** - Edit MCP server configuration
  - Update server settings
  - Manage OAuth credentials
  - Custom instructions per server
- **`/mcp/test/[id]`** - Test MCP server tools
  - Interactive tool testing interface
  - Parameter input forms
  - Response inspection

#### Workflow System
- **`/workflow`** - Workflow management dashboard
  - Visual workflow editor
  - Workflow templates and sharing
- **`/workflow/[id]`** - Individual workflow editor
  - Node-based visual editor using React Flow
  - LLM and tool node configuration
  - Workflow publishing and sharing

#### Archive System
- **`/archive/[id]`** - Archived conversation viewer
  - Read-only conversation history
  - Search and navigation within archives

---

## Components Architecture

### Layout Components
```
src/components/layouts/
├── main-layout.tsx          # Primary app layout
├── chat-layout.tsx          # Chat-specific layout
├── auth-layout.tsx          # Authentication pages layout
└── sidebar/                 # Sidebar navigation components
```

### UI Component System
Built on Radix UI primitives with custom styling:

```
src/components/ui/
├── button.tsx               # Button variants and sizes
├── input.tsx                # Form inputs
├── dialog.tsx               # Modal dialogs
├── dropdown-menu.tsx        # Context menus
├── tabs.tsx                 # Tab navigation
├── tooltip.tsx              # Tooltips and help text
├── badge.tsx                # Status badges
├── separator.tsx            # Visual separators
├── scroll-area.tsx          # Custom scrollbars
├── resizable.tsx            # Resizable panels
└── ...                      # Many more components
```

### Chat Components
```
src/components/chat/
├── message/                 # Message rendering
│   ├── message.tsx          # Individual message component
│   ├── message-content.tsx  # Message content with markdown
│   └── tool-result.tsx      # Tool execution results
├── input/                   # Message input area
│   ├── chat-input.tsx       # Main input component
│   ├── mention-picker.tsx   # @mention tool selector
│   └── file-upload.tsx      # File attachment (planned)
└── sidebar/                 # Chat sidebar
    ├── thread-list.tsx      # Conversation history
    ├── tool-selection.tsx   # Available tools
    └── model-selector.tsx   # LLM model picker
```

### Tool Invocation Components
```
src/components/tool-invocation/
├── tool-result-renderer.tsx # Generic tool result display
├── data-table.tsx           # Interactive data tables
├── chart-renderer.tsx       # Chart visualizations
├── web-search-result.tsx    # Web search formatting
├── code-execution-result.tsx # Code runner output
└── http-request-result.tsx  # API response display
```

---

## Agent System

### Agent Data Model
```typescript
type Agent = {
  id: string;
  name: string;
  description?: string;
  icon?: AgentIcon;
  userId: string;
  instructions: {
    role?: string;
    systemPrompt?: string;
    mentions?: ChatMention[];
  };
  visibility: "public" | "private" | "readonly";
  createdAt: string;
  updatedAt: string;
};

type AgentIcon = {
  type: "emoji" | "lucide";
  value: string;
  color?: string;
};
```

### Agent Instructions System
Agents can have custom system prompts and tool access:

```typescript
// Agent with specific tools and context
const githubAgent = {
  name: "GitHub Manager",
  instructions: {
    role: "GitHub Repository Manager",
    systemPrompt: `You are a GitHub repository manager. You help with:
    - Creating and managing issues
    - Pull request reviews
    - Repository maintenance
    - Code organization
    
    Always be concise and action-oriented.`,
    mentions: [
      { type: "mcp_server", value: "github-mcp" },
      { type: "tool", value: "web-search" },
    ],
  },
  visibility: "public",
};
```

### Agent Repository
```typescript
// src/lib/db/repositories/agent.repository.ts
export class AgentRepository {
  async createAgent(agent: Omit<Agent, "id" | "createdAt" | "updatedAt">) {
    return await db.insert(AgentSchema).values({
      ...agent,
      id: nanoid(),
    }).returning();
  }

  async getAgentsByUserId(userId: string) {
    return await db.select()
      .from(AgentSchema)
      .where(eq(AgentSchema.userId, userId))
      .orderBy(desc(AgentSchema.updatedAt));
  }

  async getPublicAgents() {
    return await db.select()
      .from(AgentSchema)
      .where(eq(AgentSchema.visibility, "public"))
      .orderBy(desc(AgentSchema.updatedAt));
  }
}
```

---

## Workflow System

### Visual Workflow Editor
Built using `@xyflow/react` for node-based editing:

```typescript
// Workflow node types
type WorkflowNodeType = "llm" | "tool" | "input" | "output";

type WorkflowNode = {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: LLMNodeConfig | ToolNodeConfig | IONodeConfig;
  };
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
};
```

### LLM Nodes
Execute AI reasoning within workflows:

```typescript
type LLMNodeConfig = {
  model: string; // e.g., "openai/gpt-4"
  systemPrompt: string;
  temperature: number;
  maxTokens?: number;
};
```

### Tool Nodes
Execute MCP tools within workflows:

```typescript
type ToolNodeConfig = {
  mcpServerId: string;
  toolName: string;
  parameters: Record<string, any>;
};
```

### Workflow Execution Engine
```typescript
export class WorkflowExecutor {
  async executeWorkflow(
    workflow: DBWorkflow,
    inputs: Record<string, any>
  ): Promise<Record<string, any>> {
    const nodes = await this.topologicalSort(workflow.nodes, workflow.edges);
    const results: Record<string, any> = { ...inputs };
    
    for (const node of nodes) {
      switch (node.type) {
        case "llm":
          results[node.id] = await this.executeLLMNode(node, results);
          break;
        case "tool":
          results[node.id] = await this.executeToolNode(node, results);
          break;
      }
    }
    
    return results;
  }
}
```

---

## Default Tools

### Web Search Tool
Powered by Exa AI for semantic search:

```typescript
// src/lib/ai/tools/web-search.ts
export const webSearchTool = {
  name: "web-search",
  description: "Search the web and extract content from URLs",
  parameters: z.object({
    query: z.string().describe("Search query"),
    numResults: z.number().optional().describe("Number of results (default: 5)"),
    includeContent: z.boolean().optional().describe("Include page content"),
  }),
  execute: async ({ query, numResults = 5, includeContent = false }) => {
    const exa = new ExaAPIClient(process.env.EXA_API_KEY);
    
    const results = await exa.searchAndContents(query, {
      numResults,
      includeContent,
      useAutoprompt: true,
    });
    
    return {
      results: results.results.map(result => ({
        title: result.title,
        url: result.url,
        content: result.text?.slice(0, 1000),
        publishedDate: result.publishedDate,
      })),
    };
  },
};
```

### Code Execution Tool
Sandboxed JavaScript and Python execution:

```typescript
// src/lib/ai/tools/code-executor.ts
export const jsExecutorTool = {
  name: "js-executor",
  description: "Execute JavaScript code safely",
  parameters: z.object({
    code: z.string().describe("JavaScript code to execute"),
  }),
  execute: async ({ code }) => {
    const result = await runInSandbox(code, {
      timeout: 10000,
      memoryLimit: "128mb",
    });
    
    return {
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode,
    };
  },
};
```

### Data Visualization Tools
Interactive tables and charts:

```typescript
// src/lib/ai/tools/data-visualization.ts
export const createTableTool = {
  name: "create-table",
  description: "Create an interactive data table",
  parameters: z.object({
    data: z.array(z.record(z.any())).describe("Array of row objects"),
    title: z.string().optional().describe("Table title"),
    exportable: z.boolean().optional().describe("Allow CSV/Excel export"),
  }),
  execute: async ({ data, title, exportable = true }) => {
    return {
      type: "data-table",
      data: {
        rows: data,
        title,
        features: {
          sorting: true,
          filtering: true,
          search: true,
          export: exportable,
          pagination: data.length > 50,
        },
      },
    };
  },
};
```

### HTTP Client Tool
Make API requests with full response handling:

```typescript
export const httpClientTool = {
  name: "http-client",
  description: "Make HTTP requests to APIs",
  parameters: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }),
  execute: async ({ url, method, headers, body }) => {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const responseData = await response.json();
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
    };
  },
};
```

---

## Configuration System

### Environment Variables
Comprehensive configuration through environment variables:

```typescript
// Required
POSTGRES_URL=                    # Database connection
BETTER_AUTH_SECRET=             # Authentication secret
BETTER_AUTH_URL=                # App URL for OAuth callbacks

// LLM Providers (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
XAI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=

// Optional Features
EXA_API_KEY=                    # Web search functionality
REDIS_URL=                      # Multi-instance support

// OAuth Providers
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

// Feature Flags
DISABLE_SIGN_UP=               # Disable new registrations
DISABLE_EMAIL_SIGN_IN=         # OAuth only
NOT_ALLOW_ADD_MCP_SERVERS=     # Restrict MCP server addition
FILE_BASED_MCP_CONFIG=         # Use file-based MCP config

// Timeouts & Limits
MCP_MAX_TOTAL_TIMEOUT=         # MCP tool timeout (ms)
```

### User Preferences
Stored as JSON in the user table:

```typescript
type UserPreferences = {
  theme?: "light" | "dark" | "system";
  language?: string;
  defaultModel?: string;
  toolPresets?: ToolPreset[];
  mcpInstructions?: Record<string, string>;
  toolInstructions?: Record<string, string>;
};

type ToolPreset = {
  id: string;
  name: string;
  description?: string;
  tools: string[];
  mcpServers: string[];
};
```

---

## API Reference

### Core Endpoints

#### Authentication
- `POST /api/auth/sign-in` - Email/password login
- `POST /api/auth/sign-up` - User registration  
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Logout

#### Chat System
- `POST /api/chat` - Stream chat responses
- `GET /api/chat/models` - List available models
- `POST /api/chat/title` - Generate thread titles
- `POST /api/chat/openai-realtime` - Voice chat endpoint

#### Agents
- `GET /api/agent` - List user agents
- `POST /api/agent` - Create new agent
- `GET /api/agent/[id]` - Get agent details
- `PUT /api/agent/[id]` - Update agent
- `DELETE /api/agent/[id]` - Delete agent
- `POST /api/agent/[id]/bookmark` - Bookmark agent

#### MCP Management
- `GET /api/mcp/list` - List MCP servers
- `POST /api/mcp/create` - Add MCP server
- `PUT /api/mcp/[id]` - Update MCP server
- `DELETE /api/mcp/[id]` - Remove MCP server
- `GET /api/mcp/[id]/tools` - List server tools
- `POST /api/mcp/[id]/test-tool` - Test tool execution
- `GET /api/mcp/oauth/[id]` - Initiate OAuth flow
- `GET /api/mcp/oauth/callback` - Handle OAuth callback

#### Workflows
- `GET /api/workflow` - List workflows
- `POST /api/workflow` - Create workflow
- `PUT /api/workflow/[id]` - Update workflow
- `POST /api/workflow/[id]/execute` - Execute workflow

#### User Management  
- `GET /api/user/preferences` - Get user preferences
- `PUT /api/user/preferences` - Update preferences

---

## Deployment Options

### Docker Deployment
Full-stack deployment with PostgreSQL:

```bash
# Docker Compose (recommended)
pnpm docker-compose:up

# Individual containers
pnpm docker:pg    # PostgreSQL
pnpm docker:redis # Redis (optional)
pnpm docker:app   # Application
```

### Vercel Deployment
One-click deployment with integrated services:

1. **Click Deploy Button**: Automatic Vercel deployment
2. **Database**: Integrated Neon PostgreSQL
3. **Cache**: Integrated Upstash Redis
4. **Environment**: Guided environment variable setup

### Local Development
```bash
# Install dependencies
pnpm install

# Start PostgreSQL
pnpm docker:pg

# Run database migrations
pnpm db:migrate

# Development mode
pnpm dev

# Production build
pnpm build:local && pnpm start
```

---

## Development Workflow

### Code Quality Tools
- **ESLint + Biome**: Code linting and formatting
- **TypeScript**: Strict type checking
- **Husky**: Git hooks for quality gates
- **lint-staged**: Pre-commit checks

### Testing Strategy
- **Playwright**: End-to-end testing
- **Vitest**: Unit testing
- **Multi-user Testing**: Agent sharing and visibility

### Database Management
```bash
# Generate migrations
pnpm db:generate

# Apply migrations  
pnpm db:migrate

# Push schema changes
pnpm db:push

# Database studio
pnpm db:studio

# Reset database
pnpm db:reset
```

### Build Scripts
```bash
# Development
pnpm dev              # Hot reload development

# Production
pnpm build           # Standard Next.js build
pnpm build:local     # Local production build (no HTTPS)
pnpm start           # Start production server

# Quality Checks
pnpm lint            # Run linting
pnpm lint:fix        # Fix linting issues
pnpm check-types     # TypeScript checking
pnpm test            # Run tests
pnpm check           # Full quality check
```

---

## Key Technical Innovations

### 1. MCP Protocol Integration
First-class support for the Model Context Protocol, enabling seamless integration with external tools and services.

### 2. Universal Tool System  
Unified interface for built-in tools, MCP tools, and custom workflows.

### 3. Visual Workflow Builder
Convert complex multi-step processes into reusable, shareable tools.

### 4. OAuth-Enabled Tool Access
Secure authentication flow for accessing protected external services.

### 5. Real-time Voice + Tools
Combination of OpenAI's Realtime API with full tool integration capabilities.

### 6. Collaborative AI
Share agents, workflows, and tool configurations across team members.

---

This documentation covers the complete architecture and implementation of Better Chatbot. The system's modular design and comprehensive tool integration make it a powerful platform for AI-assisted work and automation.