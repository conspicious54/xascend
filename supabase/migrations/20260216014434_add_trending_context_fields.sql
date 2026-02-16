/*
  # Add context fields to trending items

  1. Changes
    - Add `sample_tweets` column to store example tweets mentioning each item (JSONB array)
    - Add `sentiment` column to categorize the sentiment (positive, neutral, mixed)
    - Add `top_contexts` column to store common contexts where the item is mentioned (JSONB array)
    
  2. Purpose
    - Enable showing actual tweet examples for each trending item
    - Provide context for how items are being discussed
    - Help users understand the sentiment and usage patterns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_items' AND column_name = 'sample_tweets'
  ) THEN
    ALTER TABLE trending_items ADD COLUMN sample_tweets JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_items' AND column_name = 'sentiment'
  ) THEN
    ALTER TABLE trending_items ADD COLUMN sentiment TEXT DEFAULT 'neutral';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trending_items' AND column_name = 'top_contexts'
  ) THEN
    ALTER TABLE trending_items ADD COLUMN top_contexts JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;