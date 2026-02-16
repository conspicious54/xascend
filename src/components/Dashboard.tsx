import { useState, useEffect } from 'react';
import { api, type TrendingItem, type ScrapeJob } from '../lib/api';
import { TrendingUp, Calendar, Play, Loader2 } from 'lucide-react';
import CreatorManager from './CreatorManager';
import TrendingDisplay from './TrendingDisplay';
import ScrapeControls from './ScrapeControls';
import PasteFromTimeline from './PasteFromTimeline';

export default function Dashboard() {
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [recentJobs, setRecentJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'paste' | 'creators'>('trending');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, jobs] = await Promise.all([
        api.getTrendingItems(50),
        api.getScrapeJobs(5),
      ]);
      setTrendingItems(items || []);
      setRecentJobs(jobs || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeComplete = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">X Trend Tracker</h1>
          </div>
          <p className="text-slate-600">Track trending topics from top creators in the info coaching space</p>
        </header>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'trending'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trending Topics
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'paste'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste timeline
            </button>
            <button
              onClick={() => setActiveTab('creators')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'creators'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Manage Creators
            </button>
          </div>
        </div>

        {activeTab === 'paste' ? (
          <PasteFromTimeline />
        ) : activeTab === 'trending' ? (
          <>
            <ScrapeControls onScrapeComplete={handleScrapeComplete} />

            {recentJobs.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Scrape Jobs
                </h2>
                <div className="space-y-2">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {job.status === 'running' && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        )}
                        {job.status === 'completed' && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                        {job.status === 'failed' && (
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                        <span className="text-sm text-slate-600">
                          {new Date(job.period_start).toLocaleDateString()} - {new Date(job.period_end).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-900 font-medium">{job.tweets_scraped}</span>
                        <span className="text-slate-600"> tweets</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <TrendingDisplay items={trendingItems} />
          </>
        ) : (
          <CreatorManager />
        )}
      </div>
    </div>
  );
}
