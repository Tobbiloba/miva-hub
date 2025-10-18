# MIVA Academic MCP Server - New Tools Roadmap

**Goal**: Expand from 9 to 15 tools by adding 6 advanced learning features

**Timeline**: Phase-by-phase implementation
**Current Status**: Planning & Design Phase

---

## Overview: 6 New Tools

| # | Tool Name | Category | Complexity | Database Changes | AI Required |
|---|-----------|----------|------------|-----------------|-------------|
| 10 | `track_progress` | 📊 Analytics | Medium | Yes (new tables) | No |
| 11 | `recommend_resources` | 🎯 Personalization | High | Moderate | Yes |
| 12 | `chat_with_material` | 💬 Interactive | High | Moderate | Yes |
| 13 | `generate_exam_simulator` | 📝 Testing | High | Moderate | Yes |
| 14 | `convert_notes_to_flashcards` | ✏️ Productivity | Medium | Minimal | Yes |
| 15 | `summarize_video_lecture` | 🎥 Media | High | Moderate | Yes |

---

## Tool #10: `track_progress`

### **Purpose**
Track student learning progress across courses, showing what's been studied, quiz scores, mastery levels, and learning streaks.

### **User Value**
- Visual dashboard of learning progress
- Identifies weak topics needing more study
- Gamification through streaks and achievements
- Data-driven study planning

### **How It Works**
```python
@mcp.tool()
async def track_progress(
    student_id: str,
    course_code: Optional[str] = None,
    time_period: str = "all_time"  # all_time, this_week, this_month
) -> str:
    """
    Get comprehensive learning progress tracking.
    
    Returns:
    - Quiz scores over time
    - Materials studied (count, time spent)
    - Mastery levels by topic
    - Study streaks
    - Weak areas needing attention
    """
```

### **Database Schema Requirements**

**New Tables:**
```sql
-- Track every material view/study session
CREATE TABLE study_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    course_material_id UUID REFERENCES course_material(id),
    activity_type VARCHAR(50),  -- 'viewed', 'downloaded', 'quiz_taken', 'flashcard_practice'
    duration_seconds INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track quiz/test performance
CREATE TABLE quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    course_id UUID REFERENCES course(id),
    quiz_type VARCHAR(50),  -- 'generated_quiz', 'exam_simulator', 'flashcard_test'
    total_questions INTEGER,
    correct_answers INTEGER,
    score_percentage DECIMAL(5,2),
    topics_covered TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track topic mastery levels
CREATE TABLE topic_mastery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    course_id UUID REFERENCES course(id),
    topic_name VARCHAR(255),
    mastery_level DECIMAL(3,2),  -- 0.00 to 1.00
    last_practiced TIMESTAMP,
    practice_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Implementation Steps**
1. **Phase 1**: Create database tables and indexes
2. **Phase 2**: Add activity tracking to existing tools (silent logging)
3. **Phase 3**: Build analytics aggregation queries
4. **Phase 4**: Implement progress calculation algorithm
5. **Phase 5**: Create the MCP tool endpoint

### **Data Sources**
- Study Buddy API: chat history, quiz results
- Course materials: view counts, time on page
- Flashcard system: practice sessions
- Quiz generator: scores and performance

### **Success Metrics**
- Progress data available for 95%+ of active students
- <500ms response time for progress queries
- Accurate mastery level calculations

---

## Tool #11: `recommend_resources`

### **Purpose**
AI-powered personalized resource recommendations based on student's weak areas, learning style, and past performance.

### **User Value**
- Saves time finding relevant materials
- Addresses knowledge gaps proactively
- Suggests external resources (YouTube, articles, etc.)
- Adaptive to individual learning patterns

### **How It Works**
```python
@mcp.tool()
async def recommend_resources(
    student_id: str,
    course_code: str,
    focus_area: Optional[str] = None,  # Specific topic or "auto" for weak areas
    resource_types: List[str] = ["video", "article", "practice"]
) -> str:
    """
    Get personalized resource recommendations.
    
    Returns:
    - Top 5-10 recommended resources
    - Why each is recommended
    - Estimated time investment
    - Difficulty level
    """
```

### **Database Schema Requirements**

**New Tables:**
```sql
-- Store external resources
CREATE TABLE external_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(50),  -- 'youtube_video', 'article', 'interactive', 'pdf'
    title VARCHAR(500),
    url TEXT,
    description TEXT,
    topics TEXT[],
    difficulty_level VARCHAR(20),
    duration_minutes INTEGER,
    rating DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track which resources students have used
CREATE TABLE resource_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    resource_id UUID REFERENCES external_resources(id),
    interaction_type VARCHAR(50),  -- 'viewed', 'completed', 'helpful', 'not_helpful'
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Implementation Steps**
1. **Phase 1**: Analyze progress data to identify weak areas
2. **Phase 2**: Build resource database (seed with curated links)
3. **Phase 3**: Implement recommendation algorithm:
   - Collaborative filtering (what helped similar students)
   - Content-based (topic matching)
   - Performance-based (target weak areas)
4. **Phase 4**: Integrate with Study Buddy API for AI-powered suggestions
5. **Phase 5**: Add feedback loop (track if recommendations helped)

### **AI Integration**
- Uses Study Buddy API to analyze quiz results
- Semantic search to match resources to topics
- Natural language understanding of student questions

### **Success Metrics**
- 70%+ of recommendations marked "helpful"
- Students improve scores after using recommended resources
- <3 seconds recommendation generation time

---

## Tool #12: `chat_with_material`

### **Purpose**
Upload or select a PDF/document and ask questions about it conversationally, like ChatGPT with document context.

### **User Value**
- No need to read entire documents
- Quick answers from dense textbooks
- Better comprehension through Q&A
- Study while commuting (text-based)

### **How It Works**
```python
@mcp.tool()
async def chat_with_material(
    material_id: str,
    question: str,
    student_id: str,
    conversation_id: Optional[str] = None  # Continue existing chat
) -> str:
    """
    Ask questions about a specific course material.
    
    Returns:
    - Answer based on document content
    - Direct quotes/citations
    - Page numbers
    - Related sections to explore
    """
```

### **Database Schema Requirements**

**Existing Tables to Use:**
- `content_embedding` - Already has chunked text and embeddings
- `ai_processed_content` - Has summaries and key concepts

**New Table:**
```sql
-- Track conversations with materials
CREATE TABLE material_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    course_material_id UUID REFERENCES course_material(id),
    conversation_history JSONB,  -- Store Q&A pairs
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Implementation Steps**
1. **Phase 1**: Verify all materials have embeddings (from Phase 3A)
2. **Phase 2**: Modify Study Buddy API to support material-specific context
3. **Phase 3**: Implement conversation memory (store chat history)
4. **Phase 4**: Add citation extraction (page numbers, quotes)
5. **Phase 5**: Create MCP tool endpoint

### **Technical Approach**
1. User selects material or uploads PDF
2. Retrieve relevant chunks using semantic search (cosine similarity)
3. Send chunks + question + chat history to LLM
4. Extract citations and format response
5. Store conversation for follow-up questions

### **AI Integration**
- Uses existing embedding model (nomic-embed-text)
- LLM: DeepSeek or similar for Q&A
- RAG (Retrieval-Augmented Generation) pattern

### **Success Metrics**
- 90%+ answer accuracy (based on document content)
- <5 seconds response time
- Students rate answers 4+/5 stars

---

## Tool #13: `generate_exam_simulator`

### **Purpose**
Create full-length, realistic mock exams from course materials, mimicking actual exam format and difficulty.

### **User Value**
- Exam preparation under realistic conditions
- Identifies knowledge gaps before real exam
- Builds confidence and reduces test anxiety
- Timed practice for exam strategy

### **How It Works**
```python
@mcp.tool()
async def generate_exam_simulator(
    course_code: str,
    student_id: str,
    exam_type: str = "midterm",  # midterm, final, chapter_test
    time_limit_minutes: int = 90,
    question_count: int = 50,
    topics: Optional[List[str]] = None  # Specific topics or all
) -> str:
    """
    Generate a full mock exam.
    
    Returns:
    - Complete exam with questions
    - Answer key (optional, shown after submission)
    - Grading rubric
    - Time management tips
    """
```

### **Database Schema Requirements**

**New Table:**
```sql
-- Store generated exams
CREATE TABLE mock_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    course_id UUID REFERENCES course(id),
    exam_type VARCHAR(50),
    questions JSONB,  -- Array of question objects
    answer_key JSONB,
    time_limit_minutes INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Track exam attempts
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    mock_exam_id UUID REFERENCES mock_exams(id),
    student_answers JSONB,
    score DECIMAL(5,2),
    time_taken_minutes INTEGER,
    completed_at TIMESTAMP DEFAULT NOW()
);
```

### **Implementation Steps**
1. **Phase 1**: Define exam templates (multiple choice, short answer, essay)
2. **Phase 2**: Build question generation logic:
   - Extract key concepts from materials
   - Generate questions at varying difficulty levels
   - Create distractors (wrong answers) for MCQs
3. **Phase 3**: Implement exam assembly:
   - Balance topics (20% topic A, 30% topic B, etc.)
   - Mix difficulty levels (easy/medium/hard)
   - Add time estimates per question
4. **Phase 4**: Create grading system
5. **Phase 5**: Build MCP tool endpoint

### **AI Integration**
- Study Buddy API generates questions from content
- Prompt engineering for realistic exam questions
- Difficulty calibration based on Bloom's Taxonomy

### **Success Metrics**
- Mock exam scores correlate with real exam scores (r > 0.8)
- Question quality rated 4+/5 by students
- 80%+ of students find it helpful for exam prep

---

## Tool #14: `convert_notes_to_flashcards`

### **Purpose**
Automatically convert typed or handwritten notes into flashcard decks for spaced repetition study.

### **User Value**
- Saves hours of manual flashcard creation
- Works with existing notes (no re-work needed)
- Identifies key concepts automatically
- Ready for Anki/Quizlet export

### **How It Works**
```python
@mcp.tool()
async def convert_notes_to_flashcards(
    notes_text: str,  # Pasted notes or extracted from file
    student_id: str,
    course_code: str,
    card_count: int = 20,
    difficulty: str = "mixed"
) -> str:
    """
    Convert notes into flashcard deck.
    
    Returns:
    - Flashcard deck (front/back pairs)
    - Organized by topic
    - Exportable format (JSON, CSV, Anki)
    """
```

### **Database Schema Requirements**

**Existing Table:**
- `flashcard_decks` (from study_buddy_tools)

**Enhancement:**
```sql
-- Add source tracking to flashcards
ALTER TABLE flashcard_decks 
ADD COLUMN source_type VARCHAR(50),  -- 'auto_generated', 'notes_conversion', 'manual'
ADD COLUMN source_text TEXT;  -- Original notes if from conversion
```

### **Implementation Steps**
1. **Phase 1**: Text preprocessing:
   - Clean and structure notes
   - Detect headings, bullet points, definitions
2. **Phase 2**: Key concept extraction:
   - Use NLP to identify important terms
   - Extract definitions, formulas, facts
3. **Phase 3**: Flashcard generation:
   - Create Q&A pairs (front: question, back: answer)
   - Generate cloze deletions for definitions
   - Add context hints
4. **Phase 4**: Quality filtering (remove duplicates, low-quality cards)
5. **Phase 5**: Export functionality (JSON, Anki format)

### **AI Integration**
- Study Buddy API for concept extraction
- Prompt: "Convert these notes into flashcards..."
- Smart paraphrasing to avoid rote memorization

### **Success Metrics**
- 90%+ flashcards are accurate and useful
- <30 seconds processing for 500 words of notes
- Students save 80% time vs manual creation

---

## Tool #15: `summarize_video_lecture`

### **Purpose**
Upload lecture videos (or provide links) and get detailed notes, summaries, and key timestamps.

### **User Value**
- No need to watch 2-hour lectures
- Quick review before exams
- Searchable text from video content
- Jump to specific topics via timestamps

### **How It Works**
```python
@mcp.tool()
async def summarize_video_lecture(
    video_source: str,  # URL or uploaded file path
    student_id: str,
    course_code: str,
    summary_type: str = "detailed"  # brief, detailed, timestamped
) -> str:
    """
    Summarize video lecture content.
    
    Returns:
    - Text summary of video
    - Key concepts covered
    - Timestamps for important sections
    - Screenshots of slides/diagrams
    """
```

### **Database Schema Requirements**

**New Table:**
```sql
-- Store video processing results
CREATE TABLE video_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_material_id UUID REFERENCES course_material(id),
    video_url TEXT,
    transcript TEXT,
    summary TEXT,
    key_concepts JSONB,
    timestamps JSONB,  -- [{time: "12:34", topic: "Recursion basics"}]
    duration_seconds INTEGER,
    processed_at TIMESTAMP DEFAULT NOW()
);
```

### **Implementation Steps**
1. **Phase 1**: Video ingestion:
   - Support YouTube URLs
   - Support uploaded MP4/MOV files
   - Extract audio track
2. **Phase 2**: Transcription:
   - Use Whisper API (OpenAI) or similar
   - Generate SRT subtitle file
   - Timestamp alignment
3. **Phase 3**: Summarization:
   - Send transcript to LLM
   - Extract key concepts
   - Identify chapter breaks
4. **Phase 4**: Timestamp extraction:
   - Detect topic changes
   - Create clickable timestamps
5. **Phase 5**: Optional: Extract slide screenshots (OCR)

### **Technical Requirements**
- **Video processing**: FFmpeg for audio extraction
- **Transcription API**: OpenAI Whisper or AssemblyAI
- **Storage**: Cloud storage for video files (S3/GCS)
- **Processing time**: ~5-10 min for 1-hour video

### **AI Integration**
- Whisper for speech-to-text
- LLM for summarization and concept extraction
- Optional: Vision model for slide extraction

### **Success Metrics**
- 95%+ transcription accuracy
- Summaries cover 90%+ of key concepts
- Processing time < 1/10th of video length

---

## Implementation Phases

### **Phase 1: Foundation (Weeks 1-2)**
**Focus**: Database schema + basic infrastructure

- [ ] Create all new database tables
- [ ] Add migrations for existing tables
- [ ] Set up video storage (if needed)
- [ ] Test data seeding

**Tools Started**: `track_progress`, `convert_notes_to_flashcards`

---

### **Phase 2: Analytics & Tracking (Weeks 3-4)**
**Focus**: Build progress tracking foundation

- [ ] Implement `track_progress` tool
- [ ] Add silent activity logging to existing tools
- [ ] Build analytics dashboard queries
- [ ] Test mastery level calculations

**Tools Completed**: `track_progress` (Tool #10) ✅

---

### **Phase 3: AI-Powered Recommendations (Weeks 5-6)**
**Focus**: Personalization engine

- [ ] Build `recommend_resources` tool
- [ ] Seed resource database with curated content
- [ ] Implement recommendation algorithm
- [ ] Add feedback collection

**Tools Completed**: `recommend_resources` (Tool #11) ✅

---

### **Phase 4: Interactive Learning (Weeks 7-9)**
**Focus**: Chat and document interaction

- [ ] Implement `chat_with_material` tool
- [ ] Add conversation memory
- [ ] Build citation extraction
- [ ] Test with various document types

**Tools Completed**: `chat_with_material` (Tool #12) ✅

---

### **Phase 5: Assessment Tools (Weeks 10-12)**
**Focus**: Exam simulation and flashcards

- [ ] Implement `generate_exam_simulator` tool
- [ ] Build question generation logic
- [ ] Create grading system
- [ ] Implement `convert_notes_to_flashcards` tool
- [ ] Add export functionality

**Tools Completed**: 
- `generate_exam_simulator` (Tool #13) ✅
- `convert_notes_to_flashcards` (Tool #14) ✅

---

### **Phase 6: Media Processing (Weeks 13-15)**
**Focus**: Video summarization

- [ ] Set up video processing pipeline
- [ ] Integrate Whisper API
- [ ] Implement `summarize_video_lecture` tool
- [ ] Build timestamp generation
- [ ] Add slide extraction (optional)

**Tools Completed**: `summarize_video_lecture` (Tool #15) ✅

---

## Technical Dependencies

### **New APIs/Services Needed**
| Service | Purpose | Cost Estimate |
|---------|---------|---------------|
| OpenAI Whisper API | Video transcription | ~$0.006/min |
| Cloud Storage (S3/GCS) | Video file storage | ~$0.02/GB |
| YouTube Data API | Video metadata | Free (quota limits) |

### **Library Requirements**
```txt
# Add to requirements.txt
ffmpeg-python>=0.2.0  # Video processing
openai>=1.0.0  # Whisper API
scikit-learn>=1.3.0  # Recommendation algorithms
nltk>=3.8  # NLP for note processing
```

### **Compute Resources**
- Video processing: Requires background worker queue (Celery/RQ)
- Estimated: 2-4 GB RAM per concurrent video process
- Storage: ~500 MB per hour of video

---

## Database Migration Plan

### **Migration Order**
1. Create new tables (no dependencies)
2. Add columns to existing tables
3. Create indexes for performance
4. Seed initial data (resources, activity tracking)

### **Rollback Strategy**
- Keep migrations reversible
- Backup database before each phase
- Test on staging environment first

---

## Success Criteria (Overall)

### **Must Have**
- ✅ All 6 tools functional and tested
- ✅ <3 second average response time
- ✅ 95%+ uptime
- ✅ Database performance optimized

### **Should Have**
- 📊 Usage analytics dashboard
- 🔔 Error monitoring and alerts
- 📚 User documentation
- 🧪 Integration tests for each tool

### **Nice to Have**
- 📱 Mobile-optimized responses
- 🌍 Multi-language support
- 🎨 Rich media in responses (charts, images)

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Video processing too slow | High | Use background jobs, show progress |
| API costs too high (Whisper) | Medium | Set usage limits, cache results |
| Poor recommendation quality | Medium | A/B test algorithms, collect feedback |
| Database performance degradation | High | Add indexes, optimize queries |

---

## Next Steps

### **Before Starting Development**
1. ✅ Review and approve this roadmap
2. ⏳ Set up development environment
3. ⏳ Create database migration scripts
4. ⏳ Set up API keys (Whisper, etc.)
5. ⏳ Define success metrics tracking

### **First Week Tasks**
1. Create database schema (all tables)
2. Test migrations on local environment
3. Begin `track_progress` implementation
4. Set up activity logging infrastructure

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-17  
**Status**: 📋 Planning Phase
