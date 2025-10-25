# Environment Variables Configuration

This document lists all the environment variables used in the MIVA Hub frontend application.

## Required Environment Variables

### Application URLs
- `NEXT_PUBLIC_APP_URL` - Main application URL (default: `http://localhost:3000`)
- `NEXT_PUBLIC_BASE_URL` - Base URL for the application (default: `http://localhost:3000`)

### API Service URLs
- `NEXT_PUBLIC_PROGRESS_API_URL` - Progress API for saving/loading student progress (default: `http://localhost:8083`)
- `NEXT_PUBLIC_CONTENT_PROCESSOR_URL` - Content Processor API for file processing (default: `http://localhost:8082`)
- `CONTENT_PROCESSOR_URL` - Server-side content processor URL (default: `http://localhost:8082`)
- `MCP_SERVER_URL` - MCP Server URL for Model Context Protocol (default: `http://localhost:3001/sse`)
- `NEXT_PUBLIC_MCP_SERVER_URL` - Public MCP Server URL (default: `http://localhost:3001/sse`)

### Payment Configuration
- `PAYSTACK_SECRET_KEY` - Paystack secret key (required)
- `PAYSTACK_API_URL` - Paystack API URL (default: `https://api.paystack.co`)

### Database
- `POSTGRES_URL` - PostgreSQL connection string (required)

### Authentication
- `BETTER_AUTH_SECRET` - Authentication secret key (required)
- `BETTER_AUTH_URL` - Authentication URL (default: `http://localhost:3000`)

### AI Model APIs
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google AI API key
- `GROQ_API_KEY` - Groq API key
- `XAI_API_KEY` - xAI API key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OLLAMA_BASE_URL` - Ollama base URL (default: `http://localhost:11434/api`)

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

### Plan Codes
- `PRO_PLAN_CODE` - Pro plan code (set after creating plans)
- `MAX_PLAN_CODE` - Max plan code (set after creating plans)

### MCP Configuration
- `MCP_MAX_TOTAL_TIMEOUT` - MCP timeout in milliseconds (default: `120000`)

## Environment-Specific Examples

### Development
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_PROGRESS_API_URL=http://localhost:8083
NEXT_PUBLIC_CONTENT_PROCESSOR_URL=http://localhost:8082
CONTENT_PROCESSOR_URL=http://localhost:8082
MCP_SERVER_URL=http://localhost:3001/sse
NEXT_PUBLIC_MCP_SERVER_URL=http://localhost:3001/sse
PAYSTACK_API_URL=https://api.paystack.co
OLLAMA_BASE_URL=http://localhost:11434/api
```

### Production
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_PROGRESS_API_URL=https://your-progress-api.com
NEXT_PUBLIC_CONTENT_PROCESSOR_URL=https://your-content-processor.com
CONTENT_PROCESSOR_URL=https://your-content-processor.com
MCP_SERVER_URL=https://your-mcp-server.com/sse
NEXT_PUBLIC_MCP_SERVER_URL=https://your-mcp-server.com/sse
PAYSTACK_API_URL=https://api.paystack.co
```

## Notes

- All `NEXT_PUBLIC_*` variables are exposed to the client-side and should not contain sensitive information
- Server-side only variables (without `NEXT_PUBLIC_` prefix) are not exposed to the client
- Default values are provided for development, but production should use appropriate production URLs
- Some variables like `PAYSTACK_SECRET_KEY` and `BETTER_AUTH_SECRET` are required and have no defaults
