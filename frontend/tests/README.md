# Askly Regression Test Suite

Two-layer regression suite: Playwright E2E for deterministic UI flows, Python scripts for MCP tools + content pipeline + API routes.

## Quick Start

```bash
# From frontend/ directory:

# Run backend tests (MCP tools + content pipeline)
pnpm test:backend

# Run E2E tests (browser-based UI flows)
pnpm test:e2e

# Run everything
pnpm test:all
```

## Prerequisites

- Frontend dev server running on port 3001: `PORT=3001 pnpm dev`
- MCP server running on port 8080: `cd mcp-server && .venv/bin/python src/mcp/server.py --transport sse --port 8080`
- System Google Chrome installed (Playwright uses `channel: "chrome"` — NO `npx playwright install` needed)
- Python venv at `mcp-server/.venv/` with dependencies installed

## What's Covered

### Phase 1A: MCP Tool Tests (`tests/backend/test_mcp_tools.py`)
All 15 registered MCP tools called as Ada (student_id: `MIVA/CS/2024/001`):
- **Shape tests**: Each tool returns expected keys/structure
- **Data assertions**: Ada's CGPA ~4.62, classification "First Class"
- **Access control (FERPA)**: Unenrolled course access denied for get_course_materials, search_course_content, get_course_videos, get_reading_materials, get_course_syllabus, list_quizzes_and_assignments

### Phase 1B: Content Pipeline (`tests/backend/test_pipeline.py`)
- PDF extractor: import + method availability
- VTT parser: text extraction + deduplication
- yt-dlp worker: file exists + guard function + pending query
- Duplicate detector: import + response shape + first-insert-not-duplicate
- Quiz/Assignment formatters: produce searchable text with correct structure

### Phase 1C: API Routes (`tests/api-routes.spec.ts`)
- `GET /api/programs/public` → 200, array with programs
- `GET /api/academic/session/current` → 200, session + semester mapping
- `GET /api/admin/users` → 401/redirect without session
- `POST /api/auth/register` → 400 on missing fields
- `POST /api/auth/register` → 400 on malformed matric

### Phase 2A: Auth (`tests/e2e/auth.spec.ts`)
- Login as Ada → dashboard, sees her name
- Wrong password → error, stays on sign-in
- Logout → returns to sign-in

### Phase 2B: Signup (`tests/e2e/signup.spec.ts`)
- Full signup flow → dashboard with auto-enrolled courses
- Non-MIVA email → soft warning, still allowed
- Malformed matric → inline error

### Phase 2C: Navigation (`tests/e2e/navigation.spec.ts`)
- Student pages render without crash (dashboard, courses, grades, materials)
- Admin user management renders with isVerified badges

### Phase 2D: Admin Toggle (`tests/e2e/admin.spec.ts`)
- Create test student, toggle is_verified via API, assert change, toggle back, teardown

## What's NOT Covered

- **AI chat conversation flow** — excluded by design. LLM responses are non-deterministic; tested manually.
- **Video downloads** — yt-dlp worker guard is tested but no actual downloads run.
- **Email delivery** — registration tests don't assert email arrival.
- **generate_practice_questions / generate_study_guide** — these live in the Study Buddy API (port 8083), not in the MCP server's AcademicRepository. Would need HTTP calls to test.

## Test Data Safety

- **No test database** — tests run against the live Neon DB.
- **Tagged records**: Every test-created record uses identifiable tags:
  - Emails: `playwright-test-{timestamp}@example.com`
  - Content titles: `PWTEST-` prefix
- **Teardown**: Test users are deleted after each test via `DELETE /api/admin/users/:id`.
- **Read-only on seeds**: Ada, Chidi, Bisi, and admin accounts are NEVER written to or deleted by tests. Tests only READ their data.

## Browser Setup

Playwright is configured with `channel: "chrome"` to use the system-installed Google Chrome. This avoids needing `npx playwright install` to download bundled Chromium. The same Chrome that the Claude Code MCP plugin uses.

## Config

- `playwright.config.ts`: baseURL `http://localhost:3001`, chromium-only, system Chrome
- Backend tests import directly from `mcp-server/src/core/database.py`
