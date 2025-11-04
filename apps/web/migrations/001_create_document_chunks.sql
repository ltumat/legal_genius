CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_name TEXT,
  chunk_index INT,
  content TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT now()
);
