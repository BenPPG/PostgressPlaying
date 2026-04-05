-- Create a GIN full-text index for story search
CREATE INDEX IF NOT EXISTS "Story_full_text_search_idx"
ON "Story"
USING GIN (
  to_tsvector('english', coalesce("title", '') || ' ' || coalesce("summary", '') || ' ' || coalesce("content", ''))
);
