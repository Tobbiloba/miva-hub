# MCP Server Configuration

This document explains how to configure the MCP (Model Context Protocol) server URL for different environments.

## Environment Variables

### MCP_SERVER_URL

The `MCP_SERVER_URL` environment variable controls where the MCP server is located.

#### Local Development
```bash
MCP_SERVER_URL=http://localhost:3001/sse
```

#### Production (Railway)
```bash
MCP_SERVER_URL=https://miva-hub-production-3979.up.railway.app/sse
```

#### Production (Custom Domain)
```bash
MCP_SERVER_URL=https://your-production-domain.com/sse
```

## Configuration Files

The MCP server URL is configured in:

1. **`src/lib/config/mcp-config.ts`** - Central configuration file
2. **`src/app/api/mcp/default/route.ts`** - API endpoint for default MCP server
3. **`src/lib/ai/mcp/mcp-manager.ts`** - MCP manager initialization

## How It Works

1. **Environment Detection**: The system checks for `MCP_SERVER_URL` environment variable
2. **Fallback**: If not set, defaults to `http://localhost:3001/sse` for local development
3. **Dynamic Configuration**: The URL is used to initialize the MCP server connection

## Setting Up Environment Variables

### Local Development (.env.local)
```bash
# MCP Server URL for local development
MCP_SERVER_URL=http://localhost:3001/sse
```

### Production (Vercel)
In your Vercel dashboard, add the environment variable:
```
MCP_SERVER_URL=https://miva-hub-production-3979.up.railway.app/sse
```

### Production (Railway)
In your Railway dashboard, add the environment variable:
```
MCP_SERVER_URL=https://miva-hub-production-3979.up.railway.app/sse
```

## Testing the Configuration

To verify the MCP server configuration is working:

1. Check the browser console for MCP initialization messages
2. Test the `/api/mcp/default` endpoint
3. Verify the MCP server connection in the application

## Troubleshooting

### Common Issues

1. **Connection Refused**: Check if the MCP server is running on the specified URL
2. **CORS Errors**: Ensure the MCP server allows requests from your frontend domain
3. **Environment Variable Not Loaded**: Restart your development server after adding environment variables

### Debug Steps

1. Check environment variables: `console.log(process.env.MCP_SERVER_URL)`
2. Verify MCP server is accessible: `curl https://your-mcp-server-url.com/sse`
3. Check browser network tab for MCP requests
