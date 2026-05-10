# Miva Hub

A digital university platform for MIVA University. Automates student enrollment, course management, assignment grading, and faculty administration — with an AI assistant that helps students with coursework and academic questions.

## Features

- **Student Enrollment** — Automated registration and course enrollment system
- **Course Management** — Course catalog, materials, and scheduling
- **Assignment Grading** — AI-assisted grading with faculty oversight
- **Faculty Administration** — Faculty management and course administration tools
- **AI Study Assistant** — Intelligent assistant for coursework help and academic questions
- **Academic Analytics** — Track student progress, grades, and performance metrics

## Tech Stack

Next.js 15, TypeScript, PostgreSQL, Drizzle ORM, Better Auth, Python MCP Server, Radix UI, Tailwind CSS, AI SDK, Zod, Zustand

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Tobbiloba/miva-hub.git
cd miva-hub/frontend

# 2. Install dependencies
npm install -g pnpm
pnpm i

# 3. (Optional) Start a local PostgreSQL instance
pnpm docker:pg

# 4. Fill in the required values in the generated .env file
# At minimum: one LLM provider API key + POSTGRES_URL

# 5. Start the server
pnpm build:local && pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Environment Variables

```dotenv
# LLM Provider API Keys (add the ones you plan to use)
GOOGLE_GENERATIVE_AI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Database
POSTGRES_URL=postgres://your_username:your_password@localhost:5432/your_database_name

# Optional: Web search
EXA_API_KEY=

# Optional: OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Project Structure

```
miva-hub/
├── frontend/        # Next.js application
│   ├── src/
│   └── scripts/
└── mcp-server/      # Python MCP server
```

## License

MIT
