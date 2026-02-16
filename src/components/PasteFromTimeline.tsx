import { useState } from 'react';
import { api } from '../lib/api';
import { Package, BookOpen, Lightbulb, Loader2, FileText, AlertCircle, MessageSquare } from 'lucide-react';

type PasteItem = { name: string; type: string; context?: string; sentiment?: string; mention_count?: number };

export default function PasteFromTimeline() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<PasteItem[]>([]);
  const [minMentions, setMinMentions] = useState<number>(2);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      const result = await api.analyzePaste(text);
      if ('error' in result && result.error) {
        setError(result.error);
      } else if (result.items?.length) {
        setItems(result.items);
      } else {
        setError('No items extracted. Try pasting more tweet text.');
      }
    } catch (e) {
      console.error('Paste analyze error:', e);
      const msg = e instanceof Error ? e.message : 'Request failed';
      setError(
        msg.includes('404') || msg.includes('Failed')
          ? 'API not available. Deploy with the Node server (Railway/Render): Build = "npm install && npm run build", Start = "node server/index.js".'
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'software':
        return <Package className="w-5 h-5" />;
      case 'book':
        return <BookOpen className="w-5 h-5" />;
      case 'idea':
        return <Lightbulb className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'software':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'book':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'idea':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Paste from your timeline</h2>
      <p className="text-sm text-slate-600 mb-4">
        Copy your whole timeline from X (scroll, then copy). Paste below. We detect each tweet by <strong>@username</strong> or <strong>new date</strong>—so multi-line tweets, dates, and “[Image]” are handled. We find books, software, and ideas that were <strong>talked about multiple times</strong> in that period. No X API—you only pay for Claude.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your full timeline here (tweets split by @username or date)"
        className="w-full h-40 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y mb-4"
        disabled={loading}
      />

      <button
        onClick={handleAnalyze}
        disabled={loading || !text.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          'Summarize'
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Books, software & ideas in this period</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Show:</label>
              <select
                value={minMentions}
                onChange={(e) => setMinMentions(Number(e.target.value))}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value={1}>All</option>
                <option value={2}>2+ mentions</option>
                <option value={3}>3+ mentions</option>
                <option value={5}>5+ mentions</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3">
            {items
              .filter((item) => (item.mention_count ?? 1) >= minMentions)
              .map((item, i) => (
                <div
                  key={i}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3"
                >
                  <div className={`p-2 rounded-lg border ${getTypeColor(item.type)}`}>
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      {(item.mention_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-medium">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {item.mention_count} {item.mention_count === 1 ? 'post' : 'posts'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 capitalize">{item.type}</p>
                    {item.context && (
                      <p className="text-sm text-slate-600 mt-1">{item.context}</p>
                    )}
                    {item.sentiment && (
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                        item.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                        item.sentiment === 'neutral' ? 'bg-slate-100 text-slate-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.sentiment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
          {items.filter((i) => (i.mention_count ?? 1) >= minMentions).length === 0 && (
            <p className="text-sm text-slate-500 py-4">No items with {minMentions}+ mentions. Try &quot;Show: All&quot; or paste more timeline.</p>
          )}
        </div>
      )}
    </div>
  );
}
