import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tweet {
  id: string;
  tweet_id: string;
  creator_id: string;
  content: string;
  likes: number;
  retweets: number;
  replies: number;
  posted_at: string;
  scraped_at: string;
  created_at: string;
}

export interface TrendingItem {
  id: string;
  item_type: 'software' | 'book' | 'idea';
  name: string;
  mention_count: number;
  total_engagement: number;
  creator_count: number;
  time_period_start: string;
  time_period_end: string;
  sample_tweets?: Array<{
    id: string;
    content: string;
    likes: number;
    creator_id: string;
  }>;
  sentiment?: string;
  top_contexts?: string[];
  created_at: string;
  updated_at: string;
}

export interface ScrapeJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  period_start: string;
  period_end: string;
  tweets_scraped: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}
