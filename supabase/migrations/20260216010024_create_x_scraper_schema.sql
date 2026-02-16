/*
  # X Scraper Database Schema

  1. New Tables
    - `creators`
      - `id` (uuid, primary key)
      - `username` (text, unique) - X/Twitter username
      - `display_name` (text) - Display name
      - `is_active` (boolean) - Whether to scrape this creator
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tweets`
      - `id` (uuid, primary key)
      - `tweet_id` (text, unique) - Original tweet ID from X
      - `creator_id` (uuid, foreign key)
      - `content` (text) - Tweet text content
      - `likes` (integer) - Number of likes
      - `retweets` (integer) - Number of retweets
      - `replies` (integer) - Number of replies
      - `posted_at` (timestamp) - When tweet was posted
      - `scraped_at` (timestamp) - When we scraped it
      - `created_at` (timestamp)
    
    - `trending_items`
      - `id` (uuid, primary key)
      - `item_type` (text) - 'software', 'book', 'idea'
      - `name` (text) - Name of the item
      - `mention_count` (integer) - How many times mentioned
      - `total_engagement` (integer) - Sum of likes/retweets
      - `creator_count` (integer) - How many different creators mentioned it
      - `time_period_start` (timestamp) - Start of analysis period
      - `time_period_end` (timestamp) - End of analysis period
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tweet_items`
      - `id` (uuid, primary key)
      - `tweet_id` (uuid, foreign key)
      - `trending_item_id` (uuid, foreign key)
      - `created_at` (timestamp)
    
    - `scrape_jobs`
      - `id` (uuid, primary key)
      - `status` (text) - 'pending', 'running', 'completed', 'failed'
      - `period_start` (timestamp)
      - `period_end` (timestamp)
      - `tweets_scraped` (integer)
      - `error_message` (text)
      - `started_at` (timestamp)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage all data
*/

-- Create creators table
CREATE TABLE IF NOT EXISTS creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tweets table
CREATE TABLE IF NOT EXISTS tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id text UNIQUE NOT NULL,
  creator_id uuid REFERENCES creators(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes integer DEFAULT 0,
  retweets integer DEFAULT 0,
  replies integer DEFAULT 0,
  posted_at timestamptz NOT NULL,
  scraped_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create trending_items table
CREATE TABLE IF NOT EXISTS trending_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL CHECK (item_type IN ('software', 'book', 'idea')),
  name text NOT NULL,
  mention_count integer DEFAULT 0,
  total_engagement integer DEFAULT 0,
  creator_count integer DEFAULT 0,
  time_period_start timestamptz NOT NULL,
  time_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tweet_items junction table
CREATE TABLE IF NOT EXISTS tweet_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id uuid REFERENCES tweets(id) ON DELETE CASCADE,
  trending_item_id uuid REFERENCES trending_items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tweet_id, trending_item_id)
);

-- Create scrape_jobs table
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  tweets_scraped integer DEFAULT 0,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tweets_creator_id ON tweets(creator_id);
CREATE INDEX IF NOT EXISTS idx_tweets_posted_at ON tweets(posted_at);
CREATE INDEX IF NOT EXISTS idx_tweet_items_tweet_id ON tweet_items(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_items_trending_item_id ON tweet_items(trending_item_id);
CREATE INDEX IF NOT EXISTS idx_trending_items_type_period ON trending_items(item_type, time_period_start, time_period_end);

-- Enable Row Level Security
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creators
CREATE POLICY "Authenticated users can view creators"
  ON creators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert creators"
  ON creators FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update creators"
  ON creators FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete creators"
  ON creators FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for tweets
CREATE POLICY "Authenticated users can view tweets"
  ON tweets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tweets"
  ON tweets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tweets"
  ON tweets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tweets"
  ON tweets FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for trending_items
CREATE POLICY "Authenticated users can view trending_items"
  ON trending_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert trending_items"
  ON trending_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update trending_items"
  ON trending_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete trending_items"
  ON trending_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for tweet_items
CREATE POLICY "Authenticated users can view tweet_items"
  ON tweet_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tweet_items"
  ON tweet_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tweet_items"
  ON tweet_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for scrape_jobs
CREATE POLICY "Authenticated users can view scrape_jobs"
  ON scrape_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert scrape_jobs"
  ON scrape_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update scrape_jobs"
  ON scrape_jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);