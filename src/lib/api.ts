const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Creator {
  id: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
  return data as T;
}

export const api = {
  getCreators: () => request<Creator[]>('/api/creators'),
  addCreator: (username: string, display_name?: string) =>
    request<Creator>('/api/creators', {
      method: 'POST',
      body: JSON.stringify({ username: username.replace(/^@/, ''), display_name: display_name || null }),
    }),
  updateCreator: (id: string, is_active: boolean) =>
    request<void>(`/api/creators/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    }),
  deleteCreator: (id: string) =>
    request<void>(`/api/creators/${id}`, { method: 'DELETE' }),

  getTrendingItems: (limit?: number) =>
    request<TrendingItem[]>(`/api/trending-items${limit != null ? `?limit=${limit}` : ''}`),
  getScrapeJobs: (limit?: number) =>
    request<ScrapeJob[]>(`/api/scrape-jobs${limit != null ? `?limit=${limit}` : ''}`),
  startScrape: (periodStart: string, periodEnd: string) =>
    request<{ success: boolean; jobId: string; tweets_scraped: number; trending_items_found: number }>('/api/scrape', {
      method: 'POST',
      body: JSON.stringify({ periodStart, periodEnd }),
    }),

  /** Paste text from your timeline (no X API). On Netlify set VITE_PASTE_API_PATH=/.netlify/functions/analyze-paste */
  analyzePaste: (text: string) => {
    const url = import.meta.env.VITE_PASTE_API_PATH || `${API_BASE}/api/analyze-paste`;
    return request<{ items: Array<{ name: string; type: string; context?: string; sentiment?: string; mention_count?: number }> }>(url, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};
