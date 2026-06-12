CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  channel TEXT,
  duration_sec INTEGER,
  captured_at TIMESTAMPTZ DEFAULT now(),
  content_type TEXT,
  primary_topic TEXT,
  detected_language TEXT DEFAULT 'en',
  metadata JSONB DEFAULT '{}',
  UNIQUE (user_id, source_url)
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  insights JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  concepts JSONB DEFAULT '[]',
  source_start INTEGER,
  source_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_source_id ON cards(source_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at DESC);

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_cards_fts ON cards USING GIN(search_vector);

CREATE TABLE IF NOT EXISTS card_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE UNIQUE,
  embedding vector(768)
);

CREATE INDEX IF NOT EXISTS idx_card_embeddings_vector
  ON card_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);
