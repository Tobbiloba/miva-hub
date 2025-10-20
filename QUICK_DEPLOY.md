# ⚡ Quick Deploy Guide

Get your MIVA AI Assistant deployed in 15 minutes!

## 🚀 Fastest Path to Production

### Option 1: Railway (Recommended - 10 minutes)

#### Prerequisites:
- Railway account (free tier available)
- GitHub repo (or local code)
- PostgreSQL database URL

#### Steps:

**1. Deploy Study Buddy API:**
```bash
cd mcp-server
railway login
railway init
railway add
# Select: study-buddy-api
```

**Set environment variables:**
```bash
railway variables set POSTGRES_URL="your_postgres_url"
railway variables set OPENAI_API_KEY="your_key"
railway variables set PORT=8083
```

**Deploy:**
```bash
railway up
railway domain  # Get your URL
```

**2. Deploy Content Processor API:**
```bash
# Same process, different port
railway init
railway add
railway variables set PORT=8082
railway up
railway domain
```

**3. Deploy MCP Server:**
```bash
railway init
railway add
railway variables set PORT=8080
railway variables set STUDY_BUDDY_API_BASE="https://study-buddy-url.railway.app"
railway variables set CONTENT_PROCESSOR_API_BASE="https://content-processor-url.railway.app"
railway up
railway domain
```

**4. Deploy Frontend:**
```bash
cd ../frontend
vercel
# Follow prompts
# Add environment variables in Vercel dashboard
```

✅ **Done! Your app is live!**

---

### Option 2: Docker Compose (5 minutes on VPS)

**1. Clone repo on your VPS:**
```bash
git clone your-repo
cd better-chatbot-main
```

**2. Create `.env` file:**
```bash
cp mcp-server/.env.example .env
# Edit with your values
nano .env
```

**3. Deploy everything:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

**4. Check status:**
```bash
docker-compose ps
```

✅ **All services running!**

---

### Option 3: Individual Deployment

**Study Buddy API (Railway/Render):**
```bash
cd mcp-server
docker build -f Dockerfile.study-buddy -t study-buddy-api .
# Push to your container registry
# Deploy on Railway/Render
```

**Content Processor API:**
```bash
docker build -f Dockerfile.content-processor -t content-processor-api .
```

**MCP Server:**
```bash
docker build -f Dockerfile.mcp-server -t mcp-server .
```

**Frontend (Vercel):**
```bash
cd frontend
vercel --prod
```

---

## ⚙️ Environment Variables Checklist

### All Python Services:
- `POSTGRES_URL` ✅
- `OPENAI_API_KEY` ✅

### MCP Server (additionally):
- `STUDY_BUDDY_API_BASE` ✅
- `CONTENT_PROCESSOR_API_BASE` ✅

### Frontend (additionally):
- `NEXTAUTH_SECRET` ✅
- `NEXTAUTH_URL` ✅
- `NEXT_PUBLIC_MCP_SERVER_URL` ✅

---

## 🧪 Quick Test

After deployment, test each service:

```bash
# Study Buddy API
curl https://your-study-buddy-url/docs

# Content Processor API
curl https://your-content-processor-url/docs

# MCP Server
curl https://your-mcp-server-url/sse

# Frontend
# Visit: https://your-frontend-url
# Generate a quiz to test end-to-end
```

---

## 💰 Cost Breakdown

**Free Tier (MVP/Testing):**
- Railway: $5 credit/month (enough for testing)
- Vercel: Unlimited (free tier)
- Supabase: 500MB database (free)
- **Total: $0/month**

**Production (Recommended):**
- Railway: 3 services × $5 = $15/month
- Vercel: $20/month (Pro plan)
- Supabase: $25/month (Pro plan)
- **Total: ~$60/month**

---

## 🚨 Common Issues & Fixes

### "Cannot connect to database"
```bash
# Check your POSTGRES_URL format:
postgresql://user:password@host:port/database?sslmode=require
```

### "MCP Server not responding"
```bash
# Make sure it's using SSE transport:
python src/mcp/server_clean.py --transport sse --host 0.0.0.0
```

### "Usage tracking not working"
```bash
# Verify the fix is deployed:
cd mcp-server
python verify_usage_tracking.py
```

### "CORS errors"
```python
# Update CORS in your Python APIs:
allow_origins=[
    "https://your-frontend.vercel.app",
    "https://*.railway.app"
]
```

---

## 📊 Health Check URLs

Add to your monitoring:

- Study Buddy: `https://your-url/docs`
- Content Processor: `https://your-url/docs`
- MCP Server: `https://your-url/sse`
- Frontend: `https://your-url/api/health`

---

## 🎯 Production Optimization

After initial deployment:

1. **Enable caching** (Redis for session storage)
2. **Set up CDN** (Cloudflare for static assets)
3. **Configure monitoring** (Railway/Vercel built-in)
4. **Set up backups** (Supabase auto-backup)
5. **Enable error tracking** (Sentry)

---

## 📞 Need Help?

- Check logs: `railway logs` or Vercel dashboard
- Test database: `python verify_usage_tracking.py`
- Verify env vars: `railway variables` or Vercel settings
- Review docs: `DEPLOYMENT_GUIDE.md`

---

## 🎉 Next Steps

✅ Custom domain setup
✅ SSL certificate (automatic)
✅ CI/CD pipeline (GitHub Actions)
✅ Monitoring & alerts
✅ Database backups
✅ Performance optimization

---

**Deployment time: 10-15 minutes** ⚡
**Monthly cost: $0-60** 💰
**Scaling: Automatic** 🚀

