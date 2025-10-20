# 🌩️ Groq AI Integration

## ✅ What Was Updated

The MIVA AI Assistant now supports **Groq** (free, fast cloud LLM) as the primary AI provider!

### Files Modified:
1. **`requirements.txt`** - Added Groq and OpenAI libraries
2. **`src/core/ai_integration.py`** - Updated to support both Groq (cloud) and Ollama (local)

---

## 🔑 Environment Variables Needed

### For Production (Railway/Cloud):

```bash
# Required - LLM (free!)
GROQ_API_KEY=your_groq_api_key_here

# Optional - Embeddings (very cheap if you add it)
OPENAI_API_KEY=your_openai_key_here

# Database
POSTGRES_URL=your_postgres_url

# Port
PORT=8083  # or 8082, 8080 depending on service
```

---

## 🧠 How It Works

### LLM (Text Generation):
- **If `GROQ_API_KEY` is set** → Uses Groq (FREE, fast!)
- **Otherwise** → Falls back to local Ollama

### Embeddings (Semantic Search):
- **If `OPENAI_API_KEY` is set** → Uses OpenAI embeddings ($0.00002/1K tokens - almost free!)
- **Otherwise** → Falls back to local Ollama

---

## 💰 Cost Estimate

### With Groq + OpenAI Embeddings:
- **Groq LLM:** FREE (14,400 requests/day)
- **OpenAI Embeddings:** ~$0.50/month (embeddings are cached)
- **Total:** Less than $1/month!

### Without OpenAI (Groq only):
- **Groq LLM:** FREE
- **Embeddings:** Skip or use local
- **Total:** $0/month!

---

## 🚀 Models Used

### Groq (Production):
- **LLM:** `llama-3.1-70b-versatile` (smart, fast)
- **Speed:** 500-1000 tokens/second (VERY FAST!)

### Ollama (Local Development):
- **LLM:** `llama3.2:3b`
- **Embeddings:** `nomic-embed-text`

---

## ✅ Ready to Deploy!

All services now work with:
1. ✅ Groq for FREE LLM
2. ✅ Optional OpenAI for cheap embeddings
3. ✅ Falls back to Ollama for local development

**No more need for local Ollama when deployed!** 🎉

