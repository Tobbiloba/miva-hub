-- Real RAG storage for course-grounded chat (Phase 3).
-- Chunks of published course material + their OpenAI text-embedding-3-small
-- (1536-dim) vectors. Retrieval is scoped by course_id (enrollment-gated in app).
-- Applied to LOCAL askly_local; run against any other DB deliberately.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS material_chunk (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL,
  material_id  uuid NOT NULL,
  chunk_index  integer NOT NULL,
  title        text,
  material_type text,
  week_number  integer,
  content      text NOT NULL,
  embedding    vector(1536) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS material_chunk_course_idx   ON material_chunk (course_id);
CREATE INDEX IF NOT EXISTS material_chunk_material_idx ON material_chunk (material_id);
CREATE INDEX IF NOT EXISTS material_chunk_embedding_idx
  ON material_chunk USING hnsw (embedding vector_cosine_ops);
