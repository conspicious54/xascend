import { useState } from 'react';
import { api } from '../lib/api';
import { Play, Loader2, AlertCircle } from 'lucide-react';

interface ScrapeControlsProps {
  onScrapeComplete: () => void;
}

export default function ScrapeControls({ onScrapeComplete }: ScrapeControlsProps) {
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState(7);

  const handleScrape = async () => {
    setIsScraping(true);
    setError(null);

    try {
      const periodEnd = new Date();
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      await api.startScrape(periodStart.toISOString(), periodEnd.toISOString());
      onScrapeComplete();
    } catch (err) {
      console.error('Scrape error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Start New Scrape</h2>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Time Period
          </label>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={isScraping}
          >
            <option value={1}>Last 24 hours</option>
            <option value={3}>Last 3 days</option>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>

        <button
          onClick={handleScrape}
          disabled={isScraping}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
        >
          {isScraping ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Scrape
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Set <code>ANTHROPIC_API_KEY</code> and <code>X_API_BEARER_TOKEN</code> in your server <code>.env</code> to enable scraping.
        </p>
      </div>
    </div>
  );
}
