-- Migration: Convert embedding column from text to vector type
-- This enables pgvector similarity search operators

-- Step 1: Add a new column with vector type
ALTER TABLE content_embedding 
ADD COLUMN embedding_vector vector(768);

-- Step 2: Convert existing text embeddings to vector type
-- The text is stored as JSON array, we convert it to vector format
UPDATE content_embedding 
SET embedding_vector = embedding::vector(768);

-- Step 3: Drop the old text column
ALTER TABLE content_embedding 
DROP COLUMN embedding;

-- Step 4: Rename the new vector column to 'embedding'
ALTER TABLE content_embedding 
RENAME COLUMN embedding_vector TO embedding;

-- Step 5: Add index for fast similarity search using HNSW algorithm
CREATE INDEX IF NOT EXISTS content_embedding_vector_idx 
ON content_embedding USING hnsw (embedding vector_cosine_ops);

-- Verify the change
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'content_embedding' 
AND column_name = 'embedding';
