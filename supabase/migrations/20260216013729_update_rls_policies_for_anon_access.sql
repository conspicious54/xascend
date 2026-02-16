/*
  # Update RLS Policies for Anonymous Access

  1. Changes
    - Update all RLS policies to allow anonymous (anon) access
    - Change from `TO authenticated` to `TO anon, authenticated`
    - This allows users to access the dashboard without requiring authentication
  
  2. Security
    - Still maintains Row Level Security
    - Policies remain in place but allow broader access
    - Suitable for single-user or demo applications
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view creators" ON creators;
DROP POLICY IF EXISTS "Authenticated users can insert creators" ON creators;
DROP POLICY IF EXISTS "Authenticated users can update creators" ON creators;
DROP POLICY IF EXISTS "Authenticated users can delete creators" ON creators;

DROP POLICY IF EXISTS "Authenticated users can view tweets" ON tweets;
DROP POLICY IF EXISTS "Authenticated users can insert tweets" ON tweets;
DROP POLICY IF EXISTS "Authenticated users can update tweets" ON tweets;
DROP POLICY IF EXISTS "Authenticated users can delete tweets" ON tweets;

DROP POLICY IF EXISTS "Authenticated users can view trending_items" ON trending_items;
DROP POLICY IF EXISTS "Authenticated users can insert trending_items" ON trending_items;
DROP POLICY IF EXISTS "Authenticated users can update trending_items" ON trending_items;
DROP POLICY IF EXISTS "Authenticated users can delete trending_items" ON trending_items;

DROP POLICY IF EXISTS "Authenticated users can view tweet_items" ON tweet_items;
DROP POLICY IF EXISTS "Authenticated users can insert tweet_items" ON tweet_items;
DROP POLICY IF EXISTS "Authenticated users can delete tweet_items" ON tweet_items;

DROP POLICY IF EXISTS "Authenticated users can view scrape_jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Authenticated users can insert scrape_jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Authenticated users can update scrape_jobs" ON scrape_jobs;

-- Create new policies that allow anon access

-- Creators policies
CREATE POLICY "Anyone can view creators"
  ON creators FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert creators"
  ON creators FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update creators"
  ON creators FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete creators"
  ON creators FOR DELETE
  TO anon, authenticated
  USING (true);

-- Tweets policies
CREATE POLICY "Anyone can view tweets"
  ON tweets FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert tweets"
  ON tweets FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update tweets"
  ON tweets FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tweets"
  ON tweets FOR DELETE
  TO anon, authenticated
  USING (true);

-- Trending items policies
CREATE POLICY "Anyone can view trending_items"
  ON trending_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert trending_items"
  ON trending_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update trending_items"
  ON trending_items FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete trending_items"
  ON trending_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- Tweet items policies
CREATE POLICY "Anyone can view tweet_items"
  ON tweet_items FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert tweet_items"
  ON tweet_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tweet_items"
  ON tweet_items FOR DELETE
  TO anon, authenticated
  USING (true);

-- Scrape jobs policies
CREATE POLICY "Anyone can view scrape_jobs"
  ON scrape_jobs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert scrape_jobs"
  ON scrape_jobs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update scrape_jobs"
  ON scrape_jobs FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
