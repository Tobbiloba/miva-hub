# 🚀 MIVA AI Assistant - Deployment Guide

Complete guide to deploy all 4 components individually.

## 📦 Architecture Overview

| Component | Tech | Port | Purpose |
|-----------|------|------|---------|
| **Frontend** | Next.js | 3000 | Web UI |
| **MCP Server** | FastMCP (Python) | 8080 | Academic tools server |
| **Content Processor API** | FastAPI (Python) | 8082 | Content processing |
| **Study Buddy API** | FastAPI (Python) | 8083 | AI study features |
| **Database** | PostgreSQL | - | Shared data store |

---

## 🎯 Deployment Order

Deploy in this order to avoid dependency issues:

1. **Database** (if not already hosted)
2. **Study Buddy API** (port 8083)
3. **Content Processor API** (port 8082)
4. **MCP Server** (port 8080)
5. **Frontend** (port 3000)

---

## 1️⃣ Database Setup

### If using Supabase (Recommended):
✅ **Already set up** - Just need your `POSTGRES_URL`

### If self-hosting:
```bash
# DigitalOcean Managed PostgreSQL
# - Create database cluster
# - Note connection string
# - Run migrations from frontend/src/lib/db/pg/
```

**Required Environment Variable:**
```
POSTGRES_URL=postgresql://user:password@host:port/database
```

---

## 2️⃣ Study Buddy API Deployment

### Platform: **Railway / Render / Fly.io**

#### A. **Railway (Recommended)**

1. **Create New Project**
   ```bash
   railway login
   cd mcp-server
   railway init
   ```

2. **Configure Build**
   - **Root Directory:** `/mcp-server`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `python src/api/study_buddy_api.py`
   - **Port:** 8083

3. **Environment Variables:**
   ```env
   POSTGRES_URL=your_postgres_url
   OPENAI_API_KEY=your_openai_key
   PORT=8083
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get Public URL:**
   ```bash
   railway domain
   # Example: study-buddy-api-production.up.railway.app
   ```

#### B. **Dockerfile (for any platform)**

Create `mcp-server/Dockerfile.study-buddy`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 8083

# Run the API
CMD ["python", "src/api/study_buddy_api.py"]
```

**Deploy:**
```bash
docker build -f Dockerfile.study-buddy -t study-buddy-api .
docker run -p 8083:8083 --env-file .env study-buddy-api
```

---

## 3️⃣ Content Processor API Deployment

### Platform: **Railway / Render / Fly.io**

#### Same as Study Buddy API, but:
- **Start Command:** `python src/api/enhanced_content_processor_api.py`
- **Port:** 8082
- **URL:** content-processor-api-production.up.railway.app

#### Environment Variables:
```env
POSTGRES_URL=your_postgres_url
OPENAI_API_KEY=your_openai_key
PORT=8082
```

---

## 4️⃣ MCP Server Deployment

### Platform: **Railway / Render / Fly.io**

#### Configuration:
- **Start Command:** `python src/mcp/server_clean.py --transport sse --host 0.0.0.0 --port 8080`
- **Port:** 8080

#### Environment Variables:
```env
POSTGRES_URL=your_postgres_url
STUDY_BUDDY_API_BASE=https://study-buddy-api-production.up.railway.app
CONTENT_PROCESSOR_API_BASE=https://content-processor-api-production.up.railway.app
PORT=8080
```

#### Update MCP tools to use production URLs:

Edit `mcp-server/src/mcp/tools/study_buddy_tools.py`:
```python
STUDY_BUDDY_API_BASE = os.getenv(
    "STUDY_BUDDY_API_BASE", 
    "http://localhost:8083"
)
```

---

## 5️⃣ Frontend Deployment

### Platform: **Vercel (Recommended for Next.js)**

#### A. **Vercel Deployment**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Environment Variables** (on Vercel Dashboard):
   ```env
   POSTGRES_URL=your_postgres_url
   OPENAI_API_KEY=your_openai_key
   NEXTAUTH_SECRET=your_secret_here
   NEXTAUTH_URL=https://your-app.vercel.app
   
   # MCP Server URL
   NEXT_PUBLIC_MCP_SERVER_URL=https://mcp-server-production.up.railway.app
   ```

4. **Configure MCP Connection:**

Edit `frontend/.mcp.json` (or create if missing):
```json
{
  "mcpServers": {
    "miva-academic": {
      "url": "https://mcp-server-production.up.railway.app/sse",
      "transport": "sse"
    }
  }
}
```

#### B. **Alternative: Railway**

```bash
cd frontend
railway init
railway up
```

**Build Settings:**
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Port:** 3000

---

## 🔧 Production Checklist

### Before Deploying:

- [ ] **Database Migrations Run**
  ```bash
  cd frontend
  npm run db:push
  ```

- [ ] **Environment Variables Set** on all services

- [ ] **CORS Configuration** in Python APIs:
  ```python
  # In study_buddy_api.py and enhanced_content_processor_api.py
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[
          "https://your-frontend.vercel.app",
          "http://localhost:3000"  # for development
      ],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

- [ ] **Update API Base URLs** in MCP tools

- [ ] **SSL/HTTPS Enabled** (automatic on Railway/Vercel)

- [ ] **Health Check Endpoints** working

---

## 🧪 Testing Production Deployment

After deployment, test each service:

### 1. Test Study Buddy API:
```bash
curl https://study-buddy-api-production.up.railway.app/docs
```

### 2. Test Content Processor API:
```bash
curl https://content-processor-api-production.up.railway.app/docs
```

### 3. Test MCP Server:
```bash
curl https://mcp-server-production.up.railway.app/sse
```

### 4. Test Frontend:
```bash
# Visit: https://your-app.vercel.app
# Try generating a quiz to test end-to-end
```

---

## 📊 Cost Estimates

### Railway (All Python Services):
- **Hobby Plan:** $5/month per service
- **Total for 3 services:** ~$15/month
- **Includes:** 500 hours, 8GB RAM, SSL

### Vercel (Frontend):
- **Free Tier:** Unlimited for personal
- **Pro:** $20/month (commercial)

### Database (Supabase):
- **Free Tier:** 500MB, Good for MVP
- **Pro:** $25/month (2GB)

### **Total Monthly Cost:**
- **Development:** $0 (Free tiers)
- **Production:** ~$15-40/month

---

## 🔐 Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform secret management
   - Rotate keys regularly

2. **Database:**
   - Use connection pooling
   - Enable SSL connections
   - Restrict IP access if possible

3. **APIs:**
   - Enable rate limiting
   - Use API keys for MCP connections
   - Log all requests

4. **Frontend:**
   - Enable CSP headers
   - Use HTTPS only
   - Implement proper auth

---

## 🚨 Troubleshooting

### Common Issues:

**1. "Cannot connect to database"**
- Check POSTGRES_URL format
- Verify database allows external connections
- Check firewall rules

**2. "MCP Server not responding"**
- Verify SSE transport is enabled
- Check CORS settings
- Ensure port 8080 is exposed

**3. "Usage tracking not working"**
- Verify `conn.commit()` is in usage_tracker.py
- Check stored procedures exist in database
- Test with `verify_usage_tracking.py`

**4. "Frontend can't reach APIs"**
- Check NEXT_PUBLIC_ environment variables
- Verify CORS allows your frontend domain
- Check network requests in browser DevTools

---

## 📚 Platform-Specific Guides

### Railway:
- [Deploying Python Apps](https://docs.railway.app/guides/python)
- [Environment Variables](https://docs.railway.app/develop/variables)

### Vercel:
- [Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)

### Render:
- [Deploy a FastAPI App](https://render.com/docs/deploy-fastapi)

---

## 🎉 Next Steps

After successful deployment:

1. **Set up monitoring** (Railway/Vercel built-in)
2. **Configure custom domain**
3. **Set up automated backups** for database
4. **Enable error tracking** (Sentry)
5. **Set up CI/CD** for auto-deployments

---

## 📞 Support

If you encounter issues:
- Check service logs on hosting platform
- Run `verify_usage_tracking.py` for database issues
- Test each service's `/docs` endpoint
- Verify all environment variables are set


