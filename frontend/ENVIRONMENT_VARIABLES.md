# Environment Variables Configuration

This document lists all the environment variables used in the MIVA Hub frontend application.

## Required Environment Variables

### Application URLs
- `NEXT_PUBLIC_APP_URL` - Main application URL (default: `http://localhost:4001`)
- `NEXT_PUBLIC_BASE_URL` - Base URL for the application (default: `http://localhost:4001`)

### API Service URLs
- `STUDY_BUDDY_API_URL` - Server-only Study Buddy API base URL (quiz/exam/assignment progress). Browsers reach it only through the authenticated `/api/study-buddy/*` proxy. Localhost fallback in development only.
- `CONTENT_PROCESSOR_URL` - Server-side content processor URL. **Required in production** (jobs fail without it); `http://localhost:8082` fallback in development only.
- `MCP_SERVER_URL` - MCP Server URL for Model Context Protocol (default: `http://localhost:8080/sse`)
- `NEXT_PUBLIC_MCP_SERVER_URL` - Public MCP Server URL (default: `http://localhost:8080/sse`)

### Internal service secrets (set the same value on both sides)
- `MCP_SHARED_SECRET` - `X-MCP-Secret` header between the app and the MCP server. Unset = MCP server is open (logs a warning).
- `STUDY_BUDDY_SHARED_SECRET` - `X-Internal-Secret` header between the app/MCP server and Study Buddy. Unset = open (logs a warning).
- `CONTENT_PROCESSOR_SHARED_SECRET` - `X-Internal-Secret` header between the app and the content processor. Unset = open (logs a warning).
- `INTERNAL_API_SECRET` - Secret for `/api/internal/*` callers. Required — the endpoint returns 401 when unset.

### Payment Configuration
- `PAYSTACK_SECRET_KEY` - Paystack secret key (required). Production startup **fails** on an `sk_test_` key.
- `PAYSTACK_ALLOW_TEST_KEY` - Set `true` only on a staging deploy that intentionally runs a Paystack test key.
- `PAYSTACK_API_URL` - Paystack API URL (default: `https://api.paystack.co`)
- Plans and prices live in `src/lib/billing/plans.ts` (single source of truth); `pnpm db:seed:plans` upserts them.

### Database
- `POSTGRES_URL` - PostgreSQL connection string (required)

### Authentication
- `BETTER_AUTH_SECRET` - Authentication secret key (required)
- `BETTER_AUTH_URL` - Authentication URL (default: `http://localhost:4001`)

### AI Model APIs
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key
- `GROQ_API_KEY` - Groq API key
- `XAI_API_KEY` - xAI API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OLLAMA_BASE_URL` - Ollama base URL (default: `http://localhost:11434/api`)

### AI Governance
- `SNAP_GRADE_CONFIDENCE_THRESHOLD` - Snap-to-Solve auto-post threshold, 0–1 (default: `0.85`). AI grades at or above it post automatically; below it they queue for faculty review.
- `SNAP_GRADE_CALIBRATION_MIN_APPROVALS` - Calibration gate for auto-posting (default: `5`). A course must have this many faculty-**approved** snap suggestions in the AI decision ledger before confidence alone may auto-post; until then every snap grade queues for review. Overridden/rejected reviews do not count. Set to `0` to disable the gate.

### AWS Configuration
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: `us-east-1`)
- `AWS_S3_BUCKET` - S3 bucket name (default: `miva-university-content`)
- `CLOUDFRONT_DOMAIN` - CloudFront domain

### Email Configuration
- `SMTP_HOST` - SMTP host (default: `smtp.gmail.com`)
- `SMTP_PORT` - SMTP port (default: `587`)
- `SMTP_USER` - SMTP username
- `SMTP_PASSWORD` - SMTP password
- `SMTP_FROM` - From email address

### OAuth Providers
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_FORCE_ACCOUNT_SELECTION` - Force account selection (default: `false`)
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth client ID
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth client secret
- `MICROSOFT_TENANT_ID` - Microsoft tenant ID (default: `common`)
- `MICROSOFT_FORCE_ACCOUNT_SELECTION` - Force account selection (default: `false`)

### Feature Flags
- `DISABLE_EMAIL_SIGN_IN` - Disable email sign-in (default: `false`)
- `DISABLE_SIGN_UP` - Disable sign-up (default: `false`)
- `NO_HTTPS` - Disable HTTPS (default: `1` for development)

### Development/Production
- `NODE_ENV` - Node environment (default: `development`)
- `NEXT_STANDALONE_OUTPUT` - Next.js standalone output (default: `true`)

### Askly Capture extension & RAG
- `EXTENSION_ORIGINS` - Optional comma-separated `chrome-extension://<id>` origins trusted by better-auth. Empty by default — the extension authenticates with a bearer token (`/api/extension/token`), not cookies.
- `INGEST_ALLOWED_PDF_HOSTS` - Optional comma-separated hosts the server may download captured PDFs from (default: `lms-assets.miva.university,lms.miva.university`).
- `OPENAI_API_KEY` is required for RAG embeddings (`text-embedding-3-small`).

### Trials
- `STUDENT_TRIAL_DAYS` - Free-trial length for new students in days (1–365, default `7`). Set `30` during a free beta; remove at paid launch.

### Cost controls
- `CHAT_MODEL_ALLOWLIST` - Optional comma-separated `provider/model` list clients may select (e.g. `google/gemini-2.5-flash`). Unset = every model whose provider key is configured.

### WhatsApp
- `WHATSAPP_APP_SECRET` - Meta app secret used to verify `X-Hub-Signature-256` on the webhook. **Required in production** (the webhook returns 503 without it).

### Error monitoring (Sentry) — all optional; unset = Sentry fully disabled
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` - Server / browser DSN.
- `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` (and `NEXT_PUBLIC_` variants) - Default sample rate 0.1.
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` - Build-time source-map upload (only when the token is set).

### MCP Configuration
- `MCP_MAX_TOTAL_TIMEOUT` - MCP timeout in milliseconds (default: `120000`)

## Environment-Specific Examples

### Development
```bash
NEXT_PUBLIC_APP_URL=http://localhost:4001
NEXT_PUBLIC_BASE_URL=http://localhost:4001
STUDY_BUDDY_API_URL=http://localhost:8083
CONTENT_PROCESSOR_URL=http://localhost:8082
MCP_SERVER_URL=http://localhost:8080/sse
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:8080/sse
PAYSTACK_API_URL=https://api.paystack.co
OLLAMA_BASE_URL=http://localhost:11434/api
```

### Production
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
STUDY_BUDDY_API_URL=https://your-study-buddy-api.com
CONTENT_PROCESSOR_URL=https://your-content-processor.com
MCP_SHARED_SECRET=<random 32+ chars>
STUDY_BUDDY_SHARED_SECRET=<random 32+ chars>
CONTENT_PROCESSOR_SHARED_SECRET=<random 32+ chars>
INTERNAL_API_SECRET=<random 32+ chars>
WHATSAPP_APP_SECRET=<meta app secret>
MCP_SERVER_URL=https://your-mcp-server.com/sse
NEXT_PUBLIC_MCP_SERVER_URL=https://your-mcp-server.com/sse
PAYSTACK_API_URL=https://api.paystack.co
```

## Notes

- All `NEXT_PUBLIC_*` variables are exposed to the client-side and should not contain sensitive information
- Server-side only variables (without `NEXT_PUBLIC_` prefix) are not exposed to the client
- Default values are provided for development, but production should use appropriate production URLs
- Some variables like `PAYSTACK_SECRET_KEY` and `BETTER_AUTH_SECRET` are required and have no defaults
- **MCP Server Note**: The MCP server runs on port 8080 by default. Make sure to set `NEXT_PUBLIC_MCP_SERVER_URL` in production to point to your hosted MCP server
