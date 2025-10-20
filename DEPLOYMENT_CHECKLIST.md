# ✅ Deployment Checklist

Use this checklist to deploy each component step by step.

## 📋 Pre-Deployment

- [ ] **PostgreSQL Database Ready**
  - [ ] Database URL obtained
  - [ ] Migrations run: `cd frontend && npm run db:push`
  - [ ] Test connection with `verify_usage_tracking.py`

- [ ] **Environment Variables Prepared**
  - [ ] `POSTGRES_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)

- [ ] **Code Ready**
  - [ ] Latest code committed to Git
  - [ ] Usage tracking fix applied (`conn.commit()` in `usage_tracker.py`)
  - [ ] All tests passing locally

---

## 🚀 Deployment Steps

### Step 1: Deploy Study Buddy API (Port 8083)

**Platform:** Railway / Render / Fly.io

- [ ] Create new service
- [ ] Set root directory: `mcp-server`
- [ ] Set start command: `python src/api/study_buddy_api.py`
- [ ] Add environment variables:
  - [ ] `POSTGRES_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `PORT=8083`
- [ ] Deploy and verify: `curl https://your-url/docs`
- [ ] **Save URL:** `_______________________________`

### Step 2: Deploy Content Processor API (Port 8082)

**Platform:** Railway / Render / Fly.io

- [ ] Create new service
- [ ] Set root directory: `mcp-server`
- [ ] Set start command: `python src/api/enhanced_content_processor_api.py`
- [ ] Add environment variables:
  - [ ] `POSTGRES_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `PORT=8082`
- [ ] Deploy and verify: `curl https://your-url/docs`
- [ ] **Save URL:** `_______________________________`

### Step 3: Deploy MCP Server (Port 8080)

**Platform:** Railway / Render / Fly.io

- [ ] Create new service
- [ ] Set root directory: `mcp-server`
- [ ] Set start command: `python src/mcp/server_clean.py --transport sse --host 0.0.0.0 --port 8080`
- [ ] Add environment variables:
  - [ ] `POSTGRES_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `PORT=8080`
  - [ ] `STUDY_BUDDY_API_BASE` (from Step 1)
  - [ ] `CONTENT_PROCESSOR_API_BASE` (from Step 2)
- [ ] Deploy and verify: `curl https://your-url/sse`
- [ ] **Save URL:** `_______________________________`

### Step 4: Deploy Frontend (Port 3000)

**Platform:** Vercel (Recommended)

- [ ] Connect GitHub repo to Vercel
- [ ] Set root directory: `frontend`
- [ ] Add environment variables:
  - [ ] `POSTGRES_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `NEXTAUTH_SECRET`
  - [ ] `NEXTAUTH_URL=https://your-app.vercel.app`
  - [ ] `NEXT_PUBLIC_MCP_SERVER_URL` (from Step 3)
- [ ] Deploy and visit: `https://your-app.vercel.app`
- [ ] **Save URL:** `_______________________________`

---

## 🧪 Post-Deployment Testing

### Test Each Service:

- [ ] **Study Buddy API:**
  ```bash
  curl https://your-study-buddy-url/docs
  # Should return FastAPI documentation
  ```

- [ ] **Content Processor API:**
  ```bash
  curl https://your-content-processor-url/docs
  # Should return FastAPI documentation
  ```

- [ ] **MCP Server:**
  ```bash
  curl https://your-mcp-server-url/sse
  # Should return SSE endpoint info
  ```

- [ ] **Frontend:**
  - [ ] Visit homepage
  - [ ] Login with test account
  - [ ] Generate a quiz (tests entire flow)
  - [ ] Check usage tracking increments

### End-to-End Test:

- [ ] **Generate Quiz:**
  - [ ] Login to frontend
  - [ ] Ask: "Generate a quiz on data structures for CSC 301"
  - [ ] Verify quiz appears
  - [ ] Check usage tracking: `python verify_usage_tracking.py`
  - [ ] Confirm count went from 0/3 to 1/3

- [ ] **Create Flashcards:**
  - [ ] Ask: "Create flashcards on sorting algorithms"
  - [ ] Verify flashcards appear
  - [ ] Check usage tracking

- [ ] **Generate Exam:**
  - [ ] Ask: "Generate an exam simulator for CSC 301"
  - [ ] Verify exam appears
  - [ ] Check usage tracking

---

## 🔐 Security Checklist

- [ ] **Database:**
  - [ ] SSL connection enabled
  - [ ] Connection pooling configured
  - [ ] IP allowlist set (if possible)

- [ ] **APIs:**
  - [ ] CORS properly configured
  - [ ] Rate limiting enabled
  - [ ] Error messages don't leak sensitive info

- [ ] **Frontend:**
  - [ ] HTTPS enabled (automatic on Vercel)
  - [ ] Environment variables not exposed to client
  - [ ] Authentication working

- [ ] **Secrets:**
  - [ ] No `.env` files committed to Git
  - [ ] All secrets stored in platform's secret management
  - [ ] API keys rotated if exposed

---

## 📊 Monitoring Setup

- [ ] **Health Checks Configured:**
  - [ ] Study Buddy API: `/docs`
  - [ ] Content Processor API: `/docs`
  - [ ] MCP Server: `/sse`
  - [ ] Frontend: `/api/health`

- [ ] **Logging Enabled:**
  - [ ] Railway/Vercel logs accessible
  - [ ] Error tracking set up (optional: Sentry)

- [ ] **Alerts Configured:**
  - [ ] Downtime alerts
  - [ ] Error rate alerts
  - [ ] Usage spike alerts

---

## 🔄 CI/CD Setup (Optional)

- [ ] **GitHub Actions:**
  - [ ] Auto-deploy on push to `main`
  - [ ] Run tests before deploy
  - [ ] Deploy to staging first

- [ ] **Branch Strategy:**
  - [ ] `main` → Production
  - [ ] `staging` → Staging environment
  - [ ] `develop` → Development

---

## 📝 Documentation

- [ ] **Update README with:**
  - [ ] Production URLs
  - [ ] Deployment process
  - [ ] Environment variables needed

- [ ] **Document:**
  - [ ] API endpoints
  - [ ] Usage limits
  - [ ] Troubleshooting steps

---

## 🎯 Final Steps

- [ ] **Custom Domain (Optional):**
  - [ ] Purchase domain
  - [ ] Configure DNS
  - [ ] Add to Vercel/Railway

- [ ] **Backup Strategy:**
  - [ ] Database backups enabled
  - [ ] Backup frequency set
  - [ ] Restore process tested

- [ ] **Performance:**
  - [ ] CDN configured (Cloudflare)
  - [ ] Caching enabled
  - [ ] Response times acceptable

---

## 🎉 Launch Checklist

Before announcing to users:

- [ ] All services responding
- [ ] End-to-end test successful
- [ ] Usage tracking working
- [ ] Payments working (if applicable)
- [ ] Support email set up
- [ ] User documentation ready

---

## 📞 Rollback Plan

If something goes wrong:

1. **Revert to previous deployment:**
   ```bash
   railway rollback
   # or
   vercel rollback
   ```

2. **Check logs for errors:**
   ```bash
   railway logs
   vercel logs
   ```

3. **Test locally:**
   ```bash
   cd mcp-server
   python verify_usage_tracking.py
   ```

4. **Fix and redeploy**

---

## ✅ Deployment Complete!

**Your URLs:**
- Frontend: `_______________________________`
- MCP Server: `_______________________________`
- Study Buddy API: `_______________________________`
- Content Processor API: `_______________________________`

**Next Steps:**
1. Monitor for 24 hours
2. Gather user feedback
3. Optimize based on usage patterns
4. Plan next features

**Congratulations! 🎉**

